use std::sync::Mutex;
use std::time::Instant;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use chrono::{Datelike, Local, Utc};
use serde::Serialize;
use tauri::State;
use typst::foundations::{Bytes, Datetime, NativeElement, Value};
use typst::layout::PagedDocument;
use typst::syntax::{FileId, Source, VirtualPath};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World};
use typst_kit::fonts::{FontSearcher, FontSlot, Fonts};

#[derive(Serialize)]
pub struct CompileResult {
    pub pdf_base64: String,
    pub duration_ms: u64,
}

#[derive(Serialize)]
pub struct SourceMapEntry {
    pub id: String,
    pub off: u32,
    pub page: u32,
    pub x: f64,
    pub y: f64,
}

/// Shared font state that persists across compilations.
/// Fonts are expensive to discover and load, so we do it once at startup.
pub struct FontState {
    book: LazyHash<FontBook>,
    fonts: Vec<FontSlot>,
}

impl FontState {
    pub fn new() -> Self {
        let fonts: Fonts = FontSearcher::new()
            .include_system_fonts(true)
            .include_embedded_fonts(true)
            .search();
        Self {
            book: LazyHash::new(fonts.book),
            fonts: fonts.fonts,
        }
    }
}

/// Shared library state (Typst standard library).
pub struct LibraryState {
    library: LazyHash<Library>,
}

impl LibraryState {
    pub fn new() -> Self {
        Self {
            library: LazyHash::new(Library::default()),
        }
    }
}

/// Holds the last compiled document for source-map queries.
pub struct LastDocument {
    doc: Mutex<Option<PagedDocument>>,
}

impl LastDocument {
    pub fn new() -> Self {
        Self {
            doc: Mutex::new(None),
        }
    }
}

/// A minimal World implementation for in-memory Typst compilation.
struct LexTypWorld<'a> {
    library: &'a LazyHash<Library>,
    book: &'a LazyHash<FontBook>,
    fonts: &'a [FontSlot],
    source: Source,
}

impl<'a> LexTypWorld<'a> {
    fn new(
        content: String,
        library: &'a LazyHash<Library>,
        book: &'a LazyHash<FontBook>,
        fonts: &'a [FontSlot],
    ) -> Self {
        let id = FileId::new(None, VirtualPath::new("/main.typ"));
        let source = Source::new(id, content);
        Self {
            library,
            book,
            fonts,
            source,
        }
    }
}

impl World for LexTypWorld<'_> {
    fn library(&self) -> &LazyHash<Library> {
        self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        self.book
    }

    fn main(&self) -> FileId {
        self.source.id()
    }

    fn source(&self, id: FileId) -> typst::diag::FileResult<Source> {
        if id == self.source.id() {
            Ok(self.source.clone())
        } else {
            Err(typst::diag::FileError::NotFound(
                id.vpath().as_rootless_path().into(),
            ))
        }
    }

    fn file(&self, id: FileId) -> typst::diag::FileResult<Bytes> {
        Err(typst::diag::FileError::NotFound(
            id.vpath().as_rootless_path().into(),
        ))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).and_then(|slot| slot.get())
    }

    fn today(&self, offset: Option<i64>) -> Option<Datetime> {
        let now = if let Some(hours) = offset {
            let utc = Utc::now();
            let offset_secs = (hours * 3600) as i32;
            let tz = chrono::FixedOffset::east_opt(offset_secs)?;
            utc.with_timezone(&tz).date_naive()
        } else {
            Local::now().date_naive()
        };
        Datetime::from_ymd(now.year(), now.month().try_into().ok()?, now.day().try_into().ok()?)
    }
}

/// Format compilation diagnostics into a readable error string.
fn format_diagnostics(
    world: &dyn World,
    errors: &[typst::diag::SourceDiagnostic],
) -> String {
    let mut msg = String::new();
    for diag in errors {
        if !msg.is_empty() {
            msg.push('\n');
        }
        msg.push_str(&diag.message);

        // Try to add source location info
        if let Some(id) = diag.span.id() {
            if let Ok(source) = world.source(id) {
                if let Some(range) = source.range(diag.span) {
                    let line = source.lines().byte_to_line(range.start).unwrap_or(0);
                    msg.push_str(&format!(" (line {})", line + 1));
                }
            }
        }
    }
    if msg.is_empty() {
        "Typst compilation failed".to_string()
    } else {
        msg
    }
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub async fn compile_typst(
    content: String,
    font_state: State<'_, FontState>,
    library_state: State<'_, LibraryState>,
    last_doc: State<'_, LastDocument>,
) -> Result<CompileResult, String> {
    let start = Instant::now();

    let world = LexTypWorld::new(
        content,
        &library_state.library,
        &font_state.book,
        &font_state.fonts,
    );

    // Compile to a paged document
    let result = typst::compile::<PagedDocument>(&world);

    let document = result
        .output
        .map_err(|errors| format_diagnostics(&world, &errors))?;

    // Export to PDF in memory
    let pdf_bytes = typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default())
        .map_err(|errors| format_diagnostics(&world, &errors))?;

    // Store document for source-map queries
    if let Ok(mut guard) = last_doc.doc.lock() {
        *guard = Some(document);
    }

    #[allow(clippy::cast_possible_truncation, clippy::as_conversions)]
    let duration_ms = start.elapsed().as_millis() as u64;

    let pdf_base64 = BASE64.encode(&pdf_bytes);

    Ok(CompileResult {
        pdf_base64,
        duration_ms,
    })
}

#[tauri::command]
pub async fn query_source_map(
    last_doc: State<'_, LastDocument>,
) -> Result<Vec<SourceMapEntry>, String> {
    let guard = last_doc
        .doc
        .lock()
        .map_err(|_| "Failed to lock document state")?;

    let document = guard
        .as_ref()
        .ok_or("No compiled document available")?;

    let introspector = &document.introspector;

    // Query all metadata elements
    let selector = typst::foundations::Selector::Elem(
        typst::introspection::MetadataElem::ELEM,
        None,
    );

    let elements = introspector.query(&selector);
    let mut entries = Vec::new();

    for elem in &elements {
        let Some(metadata) = elem.to_packed::<typst::introspection::MetadataElem>() else {
            continue;
        };

        let Value::Dict(dict) = &metadata.value else {
            continue;
        };

        // Extract fields: id (string), off (int), pos (dict with page, x, y)
        let Some(id) = dict.get("id").ok().and_then(|v| match v {
            Value::Str(s) => Some(s.to_string()),
            _ => None,
        }) else {
            continue;
        };

        let off = dict.get("off").ok().and_then(|v| match v {
            Value::Int(n) => u32::try_from(*n).ok(),
            _ => None,
        }).unwrap_or(0);

        // Get position from introspector using the element's location
        let Some(location) = elem.location() else {
            continue;
        };
        let position = introspector.position(location);

        entries.push(SourceMapEntry {
            id,
            off,
            page: position.page.get() as u32,
            x: position.point.x.to_pt(),
            y: position.point.y.to_pt(),
        });
    }

    Ok(entries)
}
