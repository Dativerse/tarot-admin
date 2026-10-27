import { useTranslation } from "react-i18next";

type Props = {
  busy: boolean;
  dirty: boolean;
  /** The last submit failed validation. */
  invalid: boolean;
  /** The last save succeeded. */
  saved: boolean;
  /** Why the last save failed, already translated. */
  error: string | null;
  onReset: () => void;
};

/** Save and discard buttons, with the form's state: invalid, unsaved, saved, or why saving failed. */
export function FormActions({ busy, dirty, invalid, saved, error, onReset }: Props) {
  const { t } = useTranslation();
  const status = invalid ? t("form.invalid") : dirty ? t("form.unsaved") : saved ? t("form.saved") : "";

  return (
    <div className="form-actions">
      <button className="button" disabled={busy || !dirty}>
        {busy ? t("form.saving") : t("form.save")}
      </button>
      <button type="button" className="button button--ghost" onClick={onReset} disabled={busy || !dirty}>
        {t("form.reset")}
      </button>
      <p className={error || invalid ? "error" : "hint"} role="status">
        {error ?? status}
      </p>
    </div>
  );
}
