import { Sun, Moon } from "lucide-react";
import { useSettingsStore } from "../stores/settings-store";
import { useT } from "../lib/i18n";

export function SettingsPanel() {
  const t = useT();
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLocale = useSettingsStore((s) => s.setLocale);

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
    </div>
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
      className={`panel-toggle-btn ${
        active
          ? "panel-toggle-btn-active"
          : ""
      }`}
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
      className={`panel-toggle-btn ${
        active
          ? "panel-toggle-btn-active"
          : ""
      }`}
    >
      {label}
    </button>
  );
}
