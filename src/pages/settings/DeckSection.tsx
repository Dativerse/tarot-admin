import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { useDeckSettings, useErrorMessage, useUpdateDeckSettings } from "@/api/queries";
import { DECK_SIZE, DeckSettingsSchema, ReversalModeSchema, type DeckSettings } from "@/api/schemas";
import { ChoiceChips } from "@/components/ChoiceChips";
import { Field } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { useForm } from "@/components/useForm";

/** How many cards in a new deck are reversed. */
export function DeckSection() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const settings = useDeckSettings();
  const save = useUpdateDeckSettings();

  return (
    <section className="panel">
      <h2 className="panel__title">{t("deck.title")}</h2>
      <p className="hint">{t("deck.description")}</p>
      {settings.isPending && <p className="hint">{t("deck.loading")}</p>}
      {settings.isError && <p className="error">{errorMessage(settings.error)}</p>}
      {settings.data && (
        <DeckFormView
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
  initial: DeckSettings;
  busy: boolean;
  saved: boolean;
  error: string | null;
  onSubmit: (settings: DeckSettings) => void;
};

const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

function DeckFormView({ initial, busy, saved, error, onSubmit }: FormProps) {
  const { t } = useTranslation();
  const form = useForm(DeckSettingsSchema, initial);
  const { reversedRatio, reversalMode } = form.values;
  // Same rounding as Deck.Create on the server: Exact reverses round(78 × ratio) cards.
  const count = Math.round(DECK_SIZE * reversedRatio);

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = form.validate();
    if (parsed) onSubmit(parsed);
  };

  return (
    <form className="settings-form" onSubmit={submit} noValidate>
      <Field label={t("deck.ratio", { percent: formatPercent(reversedRatio) })}>
        <input
          className="range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={reversedRatio}
          onChange={(e) => form.set("reversedRatio", Number(e.target.value))}
        />
      </Field>
      <ChoiceChips
        legend={t("deck.mode")}
        name="reversalMode"
        options={ReversalModeSchema.options}
        value={reversalMode}
        label={(mode) => t(`reversalModes.${mode}`)}
        onChange={(mode) => form.set("reversalMode", mode)}
      />
      <p className="hint">
        {reversalMode === "Exact"
          ? t("deck.previewExact", { count })
          : t("deck.previewBernoulli", { count, percent: formatPercent(reversedRatio) })}
      </p>
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
