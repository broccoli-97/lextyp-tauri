//! Workspace path scoping.
//!
//! The frontend can call any registered Tauri command with any string path —
//! a compromised JS layer could read `/etc/passwd` via `read_bib_file` or
//! write arbitrary files via `save_project`. To shrink that blast radius,
//! every filesystem command validates its path against an active "workspace
//! root" that is set when the user opens a workspace folder.
//!
//! Validation canonicalises both sides so a `..` traversal or a symlink that
//! escapes the root is rejected even if the literal string looks fine.

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

/// Tauri-managed state holding the currently active workspace root.
/// `None` before `set_workspace_root` is called — every guarded command will
/// reject calls in that state, so a malicious caller cannot do anything by
/// firing commands before init.
pub struct WorkspaceRoot {
    inner: Mutex<Option<PathBuf>>,
}

impl WorkspaceRoot {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn get(&self) -> Option<PathBuf> {
        self.inner.lock().ok().and_then(|g| g.clone())
    }

    pub fn set(&self, path: PathBuf) {
        if let Ok(mut g) = self.inner.lock() {
            *g = Some(path);
        }
    }

    pub fn clear(&self) {
        if let Ok(mut g) = self.inner.lock() {
            *g = None;
        }
    }
}

/// Strictness flag for `validate`.
#[derive(Clone, Copy)]
pub enum PathKind {
    /// The path must already exist. Used by read / mutate / delete commands.
    MustExist,
    /// The path may not yet exist; the parent directory must exist and live
    /// inside the workspace. Used by `save_project`, `create_*`, and the
    /// destination of `rename_item`.
    MayBeNew,
}

/// Verify that `path` lives inside the workspace root. Returns the canonical
/// path on success so callers can use the cleaned-up form for their fs ops.
///
/// Both sides are canonicalised (`std::fs::canonicalize` resolves symlinks
/// and `..` components) so the check cannot be fooled by string-level
/// traversal. For `MayBeNew` paths, the parent is canonicalised instead and
/// joined with the basename.
pub fn validate(root: &WorkspaceRoot, path: &str, kind: PathKind) -> Result<PathBuf, String> {
    let root = root
        .get()
        .ok_or_else(|| "workspace not initialised".to_owned())?;

    let p = Path::new(path);
    let canonical = match kind {
        PathKind::MustExist => {
            std::fs::canonicalize(p).map_err(|e| format!("invalid path '{}': {}", path, e))?
        }
        PathKind::MayBeNew => {
            let parent = p
                .parent()
                .ok_or_else(|| format!("no parent for path '{}'", path))?;
            let basename = p
                .file_name()
                .ok_or_else(|| format!("no basename for path '{}'", path))?;
            let parent_canon = std::fs::canonicalize(parent)
                .map_err(|e| format!("invalid parent of '{}': {}", path, e))?;
            parent_canon.join(basename)
        }
    };

    if !canonical.starts_with(&root) {
        return Err(format!(
            "path '{}' escapes workspace root '{}'",
            path,
            root.display()
        ));
    }
    Ok(canonical)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn set_workspace_root(path: String, state: State<'_, WorkspaceRoot>) -> Result<(), String> {
    let canonical = std::fs::canonicalize(&path)
        .map_err(|e| format!("invalid workspace path '{}': {}", path, e))?;
    if !canonical.is_dir() {
        return Err(format!("not a directory: {}", canonical.display()));
    }
    state.set(canonical);
    Ok(())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn clear_workspace_root(state: State<'_, WorkspaceRoot>) {
    state.clear();
}
