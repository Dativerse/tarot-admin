import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  label: string;
  hint?: string;
  /** A message key under "validation"; replaces the hint while set. */
  error?: string;
  children: ReactNode;
};

/** A labelled input with its hint or validation message. */
export function Field({ label, hint, error, children }: Props) {
  const { t } = useTranslation();

  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{t(`validation.${error}`)}</span> : hint && <span className="hint">{hint}</span>}
    </label>
  );
}
