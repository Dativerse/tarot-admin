import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { SUPPORTED_LANGUAGES, type Language } from "./index";

/**
 * Hook for language management with URL synchronization.
 * Exposes current language, available languages, and a function to change language.
 */
export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback(
    (lng: Language) => {
      i18n.changeLanguage(lng);
      // Update URL with new language parameter
      const url = new URL(window.location.href);
      url.searchParams.set("lang", lng);
      window.history.replaceState(null, "", url.toString());
    },
    [i18n],
  );

  return {
    language: i18n.language as Language,
    languages: SUPPORTED_LANGUAGES,
    changeLanguage,
  };
}
