use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
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

use crate::workspace_guard::WorkspaceRoot;

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
/// Wrapped in `Arc` so a clone can be moved into `spawn_blocking` without
/// re-walking system font dirs or duplicating font slot caches.
pub struct FontState {
    book: Arc<LazyHash<FontBook>>,
    fonts: Arc<Vec<FontSlot>>,
}

impl FontState {
    pub fn new() -> Self {
        let fonts: Fonts = FontSearcher::new()
            .include_system_fonts(true)
            .include_embedded_fonts(true)
            .search();
        Self {
            book: Arc::new(LazyHash::new(fonts.book)),
            fonts: Arc::new(fonts.fonts),
        }
    }
}

/// Shared library state (Typst standard library).
pub struct LibraryState {
    library: Arc<LazyHash<Library>>,
}

impl LibraryState {
    pub fn new() -> Self {
        Self {
            library: Arc::new(LazyHash::new(Library::default())),
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
///
/// Owns `Arc`-wrapped handles to the long-lived font and library state so
/// the world is `Send + 'static` and can move into `tokio::task::spawn_blocking`.
///
/// The asset cache + optional workspace root together form the virtual
/// filesystem. Typst calls `World::file()` for every `#image("…")`,
/// `#read(…)`, or `@preview/` import — previously this returned `NotFound`
/// unconditionally, blocking any document with figures or imports. The
/// resolver now:
///   1. Checks an in-memory cache (already-loaded assets, future package data).
///   2. Falls back to a disk read rooted at `workspace_root`, with a
///      canonicalisation check so a `..` path in the document can't escape.
struct LexTypWorld {
    library: Arc<LazyHash<Library>>,
    book: Arc<LazyHash<FontBook>>,
    fonts: Arc<Vec<FontSlot>>,
    source: Source,
    workspace_root: Option<PathBuf>,
    assets: Mutex<HashMap<String, Bytes>>,
}

impl LexTypWorld {
    fn new(
        content: String,
        library: Arc<LazyHash<Library>>,
        book: Arc<LazyHash<FontBook>>,
        fonts: Arc<Vec<FontSlot>>,
        workspace_root: Option<PathBuf>,
        prefilled_assets: HashMap<String, Bytes>,
    ) -> Self {
        let id = FileId::new(None, VirtualPath::new("/main.typ"));
        let source = Source::new(id, content);
        Self {
            library,
            book,
            fonts,
            source,
            workspace_root,
            assets: Mutex::new(prefilled_assets),
        }
    }

    /// Load a virtual-path key from disk, validating it lives inside the
    /// workspace root. Returns `None` when no workspace is configured or
    /// the path escapes the root.
    fn load_from_workspace(&self, key: &str) -> Option<Bytes> {
        let root = self.workspace_root.as_ref()?;
        // Strip a leading slash so a `/figures/foo.png` lookup resolves
        // relative to the workspace, not the OS root.
        let trimmed = key.trim_start_matches('/');
        let candidate = root.join(trimmed);
        let canonical = std::fs::canonicalize(&candidate).ok()?;
        if !canonical.starts_with(root) {
            return None;
        }
        let bytes = std::fs::read(&canonical).ok()?;
        Some(Bytes::new(bytes))
    }
}

impl World for LexTypWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
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
        let key = id.vpath().as_rootless_path().to_string_lossy().into_owned();

        if let Ok(cache) = self.assets.lock() {
            if let Some(bytes) = cache.get(&key) {
                return Ok(bytes.clone());
            }
        }

        if let Some(bytes) = self.load_from_workspace(&key) {
            if let Ok(mut cache) = self.assets.lock() {
                cache.insert(key, bytes.clone());
            }
            return Ok(bytes);
        }

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
            let offset_secs = i32::try_from(hours * 3600).ok()?;
            let tz = chrono::FixedOffset::east_opt(offset_secs)?;
            utc.with_timezone(&tz).date_naive()
        } else {
            Local::now().date_naive()
        };
        Datetime::from_ymd(
            now.year(),
            now.month().try_into().ok()?,
            now.day().try_into().ok()?,
        )
    }
}

/// Format compilation diagnostics into a readable error string.
fn format_diagnostics(world: &dyn World, errors: &[typst::diag::SourceDiagnostic]) -> String {
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
        "Typst compilation failed".to_owned()
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
    workspace: State<'_, WorkspaceRoot>,
) -> Result<CompileResult, String> {
    let start = Instant::now();

    // Clone the Arc handles so the heavy compile can move onto a blocking
    // thread without keeping the async runtime busy. Typst is CPU-bound and
    // synchronous — running it on the async runtime would block other
    // commands (and the next compile dispatch) for the duration of the pass.
    let library = library_state.library.clone();
    let book = font_state.book.clone();
    let fonts = font_state.fonts.clone();
    let workspace_root = workspace.get();

    // `(document, pdf_bytes)` come out of the blocking task; we then return
    // to the async path to base64-encode and stash the document for source-
    // map queries.
    let (document, pdf_bytes) = tokio::task::spawn_blocking(move || {
        let world = LexTypWorld::new(
            content,
            library,
            book,
            fonts,
            workspace_root,
            HashMap::new(),
        );

        let result = typst::compile::<PagedDocument>(&world);
        let document = result
            .output
            .map_err(|errors| format_diagnostics(&world, &errors))?;

        let pdf_bytes = typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default())
            .map_err(|errors| format_diagnostics(&world, &errors))?;

        Ok::<_, String>((document, pdf_bytes))
    })
    .await
    .map_err(|e| format!("compile task panicked: {}", e))??;

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

    let document = guard.as_ref().ok_or("No compiled document available")?;

    let introspector = &document.introspector;

    // Query all metadata elements
    let selector =
        typst::foundations::Selector::Elem(typst::introspection::MetadataElem::ELEM, None);

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

        let off = dict
            .get("off")
            .ok()
            .and_then(|v| match v {
                Value::Int(n) => u32::try_from(*n).ok(),
                _ => None,
            })
            .unwrap_or(0);

        // Get position from introspector using the element's location
        let Some(location) = elem.location() else {
            continue;
        };
        let position = introspector.position(location);

        entries.push(SourceMapEntry {
            id,
            off,
            page: u32::try_from(position.page.get()).unwrap_or(1),
            x: position.point.x.to_pt(),
            y: position.point.y.to_pt(),
        });
    }

    Ok(entries)
}
