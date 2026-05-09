import { useState } from "react";
import { Sun, Moon, RefreshCw, CheckCircle2, ArrowDownCircle, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useSettingsStore } from "../stores/settings-store";
import { useT } from "../lib/i18n";

const PROJECT_REPO_URL = "https://github.com/broccoli-97/lextyp-tauri";
const TYPST_PROJECT_URL = "https://typst.app";
const TYPST_VERSION = "0.14";

type UpdateInfo = {
  has_update: boolean;
  latest_version: string;
  current_version: string;
  release_url: string;
};

type CheckState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "done"; info: UpdateInfo }
  | { kind: "error"; message: string };

export function SettingsPanel() {
  const t = useT();
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLocale = useSettingsStore((s) => s.setLocale);

  const [checkState, setCheckState] = useState<CheckState>({ kind: "idle" });

  const runUpdateCheck = async () => {
    setCheckState({ kind: "checking" });
    try {
      const info = await invoke<UpdateInfo>("check_update");
      setCheckState({ kind: "done", info });
    } catch (err) {
      setCheckState({ kind: "error", message: String(err) });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto px-3 py-4 gap-5">
      {/* Theme */}
      <SettingsSection label={t("settings.theme")}>
        <div className="flex gap-1.5">
          <ThemeButton
            active={theme === "light"}
            label={t("settings.light")}
            icon={<Sun size={14} />}
            onClick={() => setTheme("light")}
          />
          <ThemeButton
            active={theme === "dark"}
            label={t("settings.dark")}
            icon={<Moon size={14} />}
            onClick={() => setTheme("dark")}
          />
        </div>
      </SettingsSection>

      {/* Language */}
      <SettingsSection label={t("settings.language")}>
        <div className="flex gap-1.5">
          <LangButton active={locale === "en"} label="English" onClick={() => setLocale("en")} />
          <LangButton active={locale === "zh-CN"} label="简体中文" onClick={() => setLocale("zh-CN")} />
        </div>
      </SettingsSection>

      {/* Updates */}
      <SettingsSection label={t("settings.updates")}>
        <div className="flex flex-col gap-2">
          <button
            onClick={runUpdateCheck}
            disabled={checkState.kind === "checking"}
            className="btn btn-soft self-start"
          >
            <RefreshCw
              size={14}
              className={checkState.kind === "checking" ? "animate-spin" : ""}
            />
            {checkState.kind === "checking" ? t("settings.checking") : t("settings.checkNow")}
          </button>
          <UpdateStatus state={checkState} t={t} />
        </div>
      </SettingsSection>

      {/* About */}
      <SettingsSection label={t("settings.about")}>
        <div className="flex flex-col gap-3 text-[12px] text-[var(--text-secondary)] leading-relaxed">
          {/* Identity */}
          <div>
            <span className="font-semibold text-[var(--text-primary)] tracking-tight">
              LexTyp
            </span>
            <span className="ml-1.5 text-[var(--text-tertiary)] tabular-nums">
              {__APP_VERSION__}
            </span>
          </div>

          {/* Tagline */}
          <p className="m-0">{t("settings.aboutTagline")}</p>

          {/* Metadata — stacked labels above values so nothing wraps awkwardly */}
          <div className="flex flex-col gap-2">
            <AboutItem
              label={t("settings.projectLicense")}
              value="PolyForm Noncommercial 1.0.0"
            />
            <AboutItem
              label={t("settings.poweredBy")}
              value={`Typst ${TYPST_VERSION} · Apache 2.0`}
            />
          </div>

          {/* Inline links with middle-dot separator */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <LinkButton
              label={t("settings.viewRepo")}
              onClick={() => openUrl(PROJECT_REPO_URL).catch(console.error)}
            />
            <span className="text-[var(--text-muted)]">·</span>
            <LinkButton
              label={t("settings.viewTypst")}
              onClick={() => openUrl(TYPST_PROJECT_URL).catch(console.error)}
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function UpdateStatus({ state, t }: { state: CheckState; t: (k: any) => string }) {
  if (state.kind === "idle" || state.kind === "checking") {
    return null;
  }

  if (state.kind === "error") {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--error)]">
        <AlertCircle size={12} />
        <span>{t("settings.checkFailed")}: {state.message}</span>
      </div>
    );
  }

  const { info } = state;

  if (info.has_update) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        <div className="flex items-center gap-1.5 text-[var(--accent)]">
          <ArrowDownCircle size={12} />
          <span>
            {t("settings.newVersion").replace("{version}", info.latest_version)}
          </span>
        </div>
        {info.release_url && (
          <button
            onClick={() => openUrl(info.release_url).catch(console.error)}
            className="text-[var(--accent)] hover:underline underline-offset-2"
          >
            {t("settings.viewRelease")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[12px] text-[var(--success)]">
      <CheckCircle2 size={12} />
      <span>
        {t("settings.upToDate").replace("{version}", info.current_version)}
      </span>
    </div>
  );
}

function AboutItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">{label}</div>
      <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">{value}</div>
    </div>
  );
}

function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[12px] text-[var(--accent)] hover:underline underline-offset-2"
    >
      {label}
    </button>
  );
}

function SettingsSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="panel-section-label mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function ThemeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-toggle ${active ? "is-active" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}

function LangButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-toggle ${active ? "is-active" : ""}`}
    >
      {label}
    </button>
  );
}
