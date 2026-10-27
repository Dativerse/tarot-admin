import { useTranslation } from "react-i18next";
import { DeckSection } from "./DeckSection";
import { OllamaSection } from "./OllamaSection";
import { SettingsTable } from "./SettingsTable";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="stage">
      <header className="stage__header">
        <h1 className="title">{t("settingsPage.title")}</h1>
        <p className="subtitle">{t("settingsPage.subtitle")}</p>
      </header>
      <div className="settings-grid">
        <OllamaSection />
        <DeckSection />
      </div>
      <SettingsTable />
    </div>
  );
}
