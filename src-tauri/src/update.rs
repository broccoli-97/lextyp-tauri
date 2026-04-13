use serde::Serialize;

const GITHUB_API_URL: &str =
    "https://api.github.com/repos/broccoli-97/lextyp-tauri/releases/latest";

#[derive(Serialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub latest_version: String,
    pub current_version: String,
    pub release_url: String,
}

/// Check GitHub releases for a newer version.
/// Runs an HTTP request on Tauri's async runtime — does not block the UI.
#[tauri::command]
pub async fn check_update() -> Result<UpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION");

    let client = reqwest::Client::builder()
        .user_agent("LexTyp-UpdateChecker")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(GITHUB_API_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned {}", resp.status()));
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let tag = body["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v');
    let release_url = body["html_url"].as_str().unwrap_or("").to_owned();

    let has_update = version_is_newer(tag, current);

    Ok(UpdateInfo {
        has_update,
        latest_version: tag.to_owned(),
        current_version: current.to_owned(),
        release_url,
    })
}

/// Compare two semver-like version strings (e.g. "0.2.0" > "0.1.0").
fn version_is_newer(latest: &str, current: &str) -> bool {
    let parse = |s: &str| -> Vec<u64> {
        s.split('.')
            .filter_map(|p| p.parse::<u64>().ok())
            .collect()
    };
    let l = parse(latest);
    let c = parse(current);
    for i in 0..l.len().max(c.len()) {
        let lv = l.get(i).copied().unwrap_or(0);
        let cv = c.get(i).copied().unwrap_or(0);
        if lv > cv {
            return true;
        }
        if lv < cv {
            return false;
        }
    }
    false
}
