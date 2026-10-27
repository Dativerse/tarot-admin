import { useEffect, useRef, type SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  ArcanaSchema,
  CardFormSchema,
  SuitSchema,
  YesNoSchema,
  toCardForm,
  type Arcana,
  type CardDetail,
  type UpdateCardRequest,
} from "@/api/schemas";
import { ChoiceChips } from "@/components/ChoiceChips";
import { Field } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { useForm } from "@/components/useForm";

type Props = {
  card: CardDetail;
  busy: boolean;
  saved: boolean;
  error: string | null;
  onSubmit: (request: UpdateCardRequest) => void;
};

// The API names the upright and reversed variants unevenly, so each orientation lists its own keys.
const ORIENTATIONS = {
  upright: {
    yesNo: "yesNo",
    keywords: "keywordsUpright",
    meaning: "meaningUpright",
    love: "love",
    career: "career",
    mood: "mood",
    spiritual: "spiritual",
  },
  reversed: {
    yesNo: "yesNoReversed",
    keywords: "keywordsReversed",
    meaning: "meaningReversed",
    love: "loveReversed",
    career: "careerReversed",
    mood: "moodReversed",
    spiritual: "spiritualReversed",
  },
} as const;

const TEXTS = ["meaning", "love", "career", "mood", "spiritual"] as const;

// Suggestions only: these are free text in the dataset, and zodiac also holds triplicities like "Aries, Leo, Sagittarius".
const ELEMENTS = ["Fire", "Water", "Air", "Earth"];
const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

/** Edits every field of one card. */
export function CardEditor({ card, busy, saved, error, onSubmit }: Props) {
  const { t } = useTranslation();
  const form = useForm(CardFormSchema, toCardForm(card));
  const { values, errors, set } = form;
  const formRef = useRef<HTMLFormElement>(null);

  // The form is taller than the screen: after a failed save, bring the first problem into view.
  useEffect(() => {
    const problem = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .field__error');
    problem?.scrollIntoView({ block: "center" });
    if (problem?.matches("input, textarea")) problem.focus({ preventScroll: true });
  }, [errors]);

  // Major Arcana have no suit; switching back to minor restores the stored one.
  const setArcana = (arcana: Arcana) =>
    form.setValues((v) => ({ ...v, arcana, suit: arcana === "major" ? null : (v.suit ?? card.suit) }));

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = form.validate();
    if (parsed) onSubmit(parsed);
  };

  return (
    <form ref={formRef} className="editor__form" onSubmit={submit} noValidate>
      <section className="panel">
        <h2 className="panel__title">{t("cardEditor.identity")}</h2>
        <Field label={t("cardEditor.name")} error={errors.name}>
          <input
            className="input"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name !== undefined}
          />
        </Field>
        <ChoiceChips
          legend={t("cardEditor.arcana")}
          name="arcana"
          options={ArcanaSchema.options}
          value={values.arcana}
          label={(a) => t(`arcana.${a}`)}
          onChange={setArcana}
        />
        {values.arcana === "minor" && (
          <ChoiceChips
            legend={t("cardEditor.suit")}
            name="suit"
            options={SuitSchema.options}
            value={values.suit}
            label={(s) => t(`suits.${s}`)}
            onChange={(s) => set("suit", s)}
            error={errors.suit}
          />
        )}
      </section>

      <section className="panel">
        <h2 className="panel__title">{t("cardEditor.correspondences")}</h2>
        <div className="form-grid">
          <Field label={t("cardEditor.numerology")} error={errors.numberNumerology}>
            <input
              className="input"
              inputMode="numeric"
              value={values.numberNumerology}
              onChange={(e) => set("numberNumerology", e.target.value)}
              aria-invalid={errors.numberNumerology !== undefined}
            />
          </Field>
          <Field label={t("cardEditor.element")} error={errors.element}>
            <input
              className="input"
              list="elements"
              value={values.element}
              onChange={(e) => set("element", e.target.value)}
              aria-invalid={errors.element !== undefined}
            />
          </Field>
          <Field label={t("cardEditor.planet")} hint={t("cardEditor.planetHint")}>
            <input className="input" list="planets" value={values.planet} onChange={(e) => set("planet", e.target.value)} />
          </Field>
          <Field label={t("cardEditor.zodiac")} error={errors.zodiac}>
            <input
              className="input"
              list="signs"
              value={values.zodiac}
              onChange={(e) => set("zodiac", e.target.value)}
              aria-invalid={errors.zodiac !== undefined}
            />
          </Field>
        </div>
        <Suggestions id="elements" values={ELEMENTS} />
        <Suggestions id="planets" values={PLANETS} />
        <Suggestions id="signs" values={SIGNS} />
      </section>

      <div className="orientations">
        {(["upright", "reversed"] as const).map((orientation) => {
          const key = ORIENTATIONS[orientation];
          return (
            <section key={orientation} className="panel">
              <h2 className="panel__title">{t(`orientations.${orientation}`)}</h2>
              <ChoiceChips
                legend={t("cardEditor.yesNo")}
                name={key.yesNo}
                options={YesNoSchema.options}
                value={values[key.yesNo]}
                label={(answer) => t(`yesNo.${answer}`)}
                onChange={(answer) => set(key.yesNo, answer)}
              />
              <Field label={t("cardEditor.keywords")} hint={t("cardEditor.keywordsHint")} error={errors[key.keywords]}>
                <input
                  className="input"
                  value={values[key.keywords]}
                  onChange={(e) => set(key.keywords, e.target.value)}
                  aria-invalid={errors[key.keywords] !== undefined}
                />
              </Field>
              {TEXTS.map((text) => (
                <Field key={text} label={t(`cardEditor.${text}`)} error={errors[key[text]]}>
                  <textarea
                    className="input"
                    rows={2}
                    value={values[key[text]]}
                    onChange={(e) => set(key[text], e.target.value)}
                    aria-invalid={errors[key[text]] !== undefined}
                  />
                </Field>
              ))}
            </section>
          );
        })}
      </div>

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

function Suggestions({ id, values }: { id: string; values: string[] }) {
  return (
    <datalist id={id}>
      {values.map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}
