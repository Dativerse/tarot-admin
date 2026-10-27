import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession, useSignOut } from "@/api/queries";
import { SessionGate } from "@/components/SessionGate";
import { useLanguage } from "@/i18n/useLanguage";
import CardPage from "@/pages/card";
import CardsPage from "@/pages/cards";
import SettingsPage from "@/pages/settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/cards" replace />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="cards/:id" element={<CardPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/cards" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) => `nav__link${isActive ? " is-active" : ""}`;

function Layout() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const session = useSession();
  const signOut = useSignOut();
  const signedIn = session.data === true;

  return (
    <div className="app">
      <header className="header">
        <Link className="brand" to="/">
          <span aria-hidden="true">☾</span> {t("brand")}
        </Link>
        {signedIn && (
          <nav className="nav" aria-label={t("nav.label")}>
            <NavLink className={navLinkClass} to="/cards">
              {t("nav.cards")}
            </NavLink>
            <NavLink className={navLinkClass} to="/settings">
              {t("nav.settings")}
            </NavLink>
          </nav>
        )}
        <div className="lang-switcher">
          <button
            className={`lang-switcher__btn${language === "en" ? " is-active" : ""}`}
            onClick={() => changeLanguage("en")}
            aria-pressed={language === "en"}
          >
            EN
          </button>
          <span className="lang-switcher__sep">|</span>
          <button
            className={`lang-switcher__btn${language === "vi" ? " is-active" : ""}`}
            onClick={() => changeLanguage("vi")}
            aria-pressed={language === "vi"}
          >
            VI
          </button>
        </div>
        {signedIn && (
          <button className="link" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
            {t("nav.signOut")}
          </button>
        )}
      </header>
      <main className="main">
        <SessionGate>
          <Outlet />
        </SessionGate>
      </main>
      <footer className="footer">{t("footer")}</footer>
    </div>
  );
}
