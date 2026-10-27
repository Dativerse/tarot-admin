import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { useErrorMessage, useOllamaSettings, useUpdateOllamaSettings } from "@/api/queries";
import { OllamaFormSchema, type OllamaSettings } from "@/api/schemas";
import { Field } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { useForm } from "@/components/useForm";

/** The model endpoint the worker generates readings with. */
export function OllamaSection() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const settings = useOllamaSettings();
  const save = useUpdateOllamaSettings();

  return (
    <section className="panel">
      <h2 className="panel__title">{t("ollama.title")}</h2>
      <p className="hint">{t("ollama.description")}</p>
      {settings.isPending && <p className="hint">{t("ollama.loading")}</p>}
      {settings.isError && <p className="error">{errorMessage(settings.error)}</p>}
      {settings.data && (
        <OllamaFormView
          // Starts over when the stored values change, from this form or from the table below.
          key={JSON.stringify(settings.data)}
          initial={settings.data}
          busy={save.isPending}
          saved={save.isSuccess}
          error={save.isError ? errorMessage(save.error) : null}
          onSubmit={(values) => save.mutate(values)}
        />
      )}
    </section>
  );
}

type FormProps = {
  initial: OllamaSettings;
  busy: boolean;
  saved: boolean;
  error: string | null;
  onSubmit: (settings: OllamaSettings) => void;
};

function OllamaFormView({ initial, busy, saved, error, onSubmit }: FormProps) {
  const { t } = useTranslation();
  const form = useForm(OllamaFormSchema, { ...initial, timeoutSeconds: String(initial.timeoutSeconds) });
  const { values, errors, set } = form;

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = form.validate();
    if (parsed) onSubmit(parsed);
  };

  return (
    <form className="settings-form" onSubmit={submit} noValidate>
      <Field label={t("ollama.baseUrl")} hint={t("ollama.baseUrlHint")} error={errors.baseUrl}>
        <input
          className="input input--mono"
          type="url"
          value={values.baseUrl}
          onChange={(e) => set("baseUrl", e.target.value)}
          aria-invalid={errors.baseUrl !== undefined}
          spellCheck={false}
        />
      </Field>
      <Field label={t("ollama.model")} hint={t("ollama.modelHint")} error={errors.model}>
        <input
          className="input input--mono"
          value={values.model}
          onChange={(e) => set("model", e.target.value)}
          aria-invalid={errors.model !== undefined}
          spellCheck={false}
        />
      </Field>
      <Field label={t("ollama.timeout")} error={errors.timeoutSeconds}>
        <input
          className="input"
          type="number"
          min={1}
          max={3600}
          value={values.timeoutSeconds}
          onChange={(e) => set("timeoutSeconds", e.target.value)}
          aria-invalid={errors.timeoutSeconds !== undefined}
        />
      </Field>
      <FormActions
        busy={busy}
        dirty={form.dirty}
        invalid={form.invalid}
        saved={saved}
        error={error}
        onReset={form.reset}
      />
    </form>
  );
}
