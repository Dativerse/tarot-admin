import { z } from "zod";

// The Admin API contract. Every response is parsed against these in http.ts; types come from z.infer.

export const DECK_SIZE = 78;

export const ArcanaSchema = z.enum(["major", "minor"]);
export const SuitSchema = z.enum(["wands", "cups", "swords", "pentacles"]);
export const YesNoSchema = z.enum(["yes", "no", "maybe"]);
export const ReversalModeSchema = z.enum(["Bernoulli", "Exact"]);

const Timestamp = z.iso.datetime({ offset: true });

export const CardSchema = z.object({
  id: z.int().min(0).max(DECK_SIZE - 1),
  name: z.string(),
  arcana: ArcanaSchema,
  suit: SuitSchema.nullable(),
});

/** Every field of a card, as the editor shows it. */
export const CardDetailSchema = CardSchema.extend({
  numberNumerology: z.int().nonnegative(),
  element: z.string(),
  planet: z.string().nullable(),
  zodiac: z.string(),
  yesNo: YesNoSchema,
  yesNoReversed: YesNoSchema,
  keywordsUpright: z.array(z.string()),
  keywordsReversed: z.array(z.string()),
  meaningUpright: z.string(),
  meaningReversed: z.string(),
  love: z.string(),
  loveReversed: z.string(),
  career: z.string(),
  careerReversed: z.string(),
  mood: z.string(),
  moodReversed: z.string(),
  spiritual: z.string(),
  spiritualReversed: z.string(),
});

export const SeedResultSchema = z.object({ cardsSeeded: z.int().nonnegative() });

export const SettingSchema = z.object({
  name: z.string(),
  /** JSON text as stored, e.g. `"llama3.2:3b"` with its quotes, or `0.3`. */
  value: z.string(),
  description: z.string().nullable(),
  updatedAt: Timestamp,
});

export const OllamaSettingsSchema = z.object({
  baseUrl: z.string(),
  model: z.string(),
  timeoutSeconds: z.int(),
});

export const DeckSettingsSchema = z.object({
  reversedRatio: z.number().min(0).max(1),
  reversalMode: ReversalModeSchema,
});

/** Error codes the Admin API puts in `errors`. */
export const ErrorCodeSchema = z.enum(["INTERNAL_ERROR", "UNAUTHORIZED", "NOT_FOUND", "RATE_LIMITED", "VALIDATION_ERROR"]);

/** One entry of `errors`: a code, and metadata about it when there is any (usually null). */
export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

/** Every response body. `errors` is empty on success; on failure `data` is null and the status is still 200 OK. */
export const EnvelopeSchema = z.object({
  errors: z.array(ApiErrorSchema),
  data: z.unknown(),
});

export type Arcana = z.infer<typeof ArcanaSchema>;
export type Suit = z.infer<typeof SuitSchema>;
export type YesNo = z.infer<typeof YesNoSchema>;
export type ReversalMode = z.infer<typeof ReversalModeSchema>;
export type Card = z.infer<typeof CardSchema>;
export type CardDetail = z.infer<typeof CardDetailSchema>;
export type Setting = z.infer<typeof SettingSchema>;
export type OllamaSettings = z.infer<typeof OllamaSettingsSchema>;
export type DeckSettings = z.infer<typeof DeckSettingsSchema>;
export type ServerErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ApiErrorEntry = z.infer<typeof ApiErrorSchema>;

// Request validation, shared by forms and the http layer. Messages are keys under "validation" in the locales.

const Text = z.string().trim().min(1, "required");

/** A whole number typed into a text input. */
const WholeNumber = (message: string) => z.string().trim().regex(/^\d+$/, message).transform(Number);

/** Comma-separated in the form, an array in the API. */
const Keywords = z
  .string()
  .transform((text) =>
    text
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string()).min(1, "keywordsRequired"));

export const CardFormSchema = z
  .object({
    name: Text,
    arcana: ArcanaSchema,
    suit: SuitSchema.nullable(),
    numberNumerology: WholeNumber("numerologyInvalid"),
    element: Text,
    planet: z
      .string()
      .trim()
      .transform((planet) => planet || null),
    zodiac: Text,
    yesNo: YesNoSchema,
    yesNoReversed: YesNoSchema,
    keywordsUpright: Keywords,
    keywordsReversed: Keywords,
    meaningUpright: Text,
    meaningReversed: Text,
    love: Text,
    loveReversed: Text,
    career: Text,
    careerReversed: Text,
    mood: Text,
    moodReversed: Text,
    spiritual: Text,
    spiritualReversed: Text,
  })
  .refine((card) => card.arcana === "major" || card.suit !== null, { error: "suitRequired", path: ["suit"] })
  .transform((card) => (card.arcana === "major" ? { ...card, suit: null } : card));
export type CardForm = z.input<typeof CardFormSchema>;

/** The editor's starting values: what the inputs hold for this card. */
export const toCardForm = ({ id: _id, numberNumerology, planet, keywordsUpright, keywordsReversed, ...card }: CardDetail): CardForm => ({
  ...card,
  numberNumerology: String(numberNumerology),
  planet: planet ?? "",
  keywordsUpright: keywordsUpright.join(", "),
  keywordsReversed: keywordsReversed.join(", "),
});

/** Replaces every field of the card; a null suit means it has none. */
export type UpdateCardRequest = z.output<typeof CardFormSchema>;

export const OllamaFormSchema = z.object({
  baseUrl: z.url({ protocol: /^https?$/, error: "baseUrlInvalid" }),
  model: Text,
  timeoutSeconds: WholeNumber("timeoutInvalid").pipe(z.int().min(1, "timeoutInvalid").max(3600, "timeoutInvalid")),
});
export type OllamaForm = z.input<typeof OllamaFormSchema>;

const isJson = (text: string) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

/** A setting's value is typed as JSON text and sent parsed; the API stores it serialized again. */
export const SettingValueFormSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "valueRequired")
    .refine(isJson, "valueInvalidJson")
    .transform((text): unknown => JSON.parse(text)),
  description: z.string().trim(),
});

// The typed endpoints /api/admin/settings/ollama and /deck shadow settings with these names.
const RESERVED_NAMES = ["ollama", "deck"];

export const newSettingSchema = (existing: string[]) =>
  SettingValueFormSchema.extend({
    name: z
      .string()
      .trim()
      .min(1, "required")
      .max(128, "nameTooLong")
      .regex(/^[\w.:-]+$/, "nameInvalid")
      .refine((name) => !RESERVED_NAMES.includes(name.toLowerCase()), "nameReserved")
      .refine((name) => !existing.includes(name), "nameTaken"),
  });
