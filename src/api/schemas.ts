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

/**
 * One record of the Tarotoo dataset as stored in cards.data, with its snake_case keys.
 * Loose because an update replaces the whole object, so keys this app doesn't know must survive a save.
 */
export const CardDataSchema = z.looseObject({
  number_numerology: z.int().nonnegative(),
  element: z.string(),
  planet: z.string().nullable(),
  zodiac: z.string(),
  yes_no: YesNoSchema,
  yes_no_reversed: YesNoSchema,
  keywords_upright: z.array(z.string()),
  keywords_reversed: z.array(z.string()),
  meaning_upright: z.string(),
  meaning_reversed: z.string(),
  love: z.string(),
  love_reversed: z.string(),
  career: z.string(),
  career_reversed: z.string(),
  mood: z.string(),
  mood_reversed: z.string(),
  spiritual: z.string(),
  spiritual_reversed: z.string(),
});

export const CardDetailSchema = CardSchema.extend({ data: CardDataSchema });

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
export type CardData = z.infer<typeof CardDataSchema>;
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

/** Comma-separated in the form, an array in the dataset. */
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
    number_numerology: WholeNumber("numerologyInvalid"),
    element: Text,
    planet: z
      .string()
      .trim()
      .transform((planet) => planet || null),
    zodiac: Text,
    yes_no: YesNoSchema,
    yes_no_reversed: YesNoSchema,
    keywords_upright: Keywords,
    keywords_reversed: Keywords,
    meaning_upright: Text,
    meaning_reversed: Text,
    love: Text,
    love_reversed: Text,
    career: Text,
    career_reversed: Text,
    mood: Text,
    mood_reversed: Text,
    spiritual: Text,
    spiritual_reversed: Text,
  })
  .refine((card) => card.arcana === "major" || card.suit !== null, { error: "suitRequired", path: ["suit"] })
  .transform((card) => (card.arcana === "major" ? { ...card, suit: null } : card));
export type CardForm = z.input<typeof CardFormSchema>;

/** The editor's starting values: what the inputs hold for this card. */
export const toCardForm = ({ name, arcana, suit, data }: CardDetail): CardForm => ({
  name,
  arcana,
  suit,
  number_numerology: String(data.number_numerology),
  element: data.element,
  planet: data.planet ?? "",
  zodiac: data.zodiac,
  yes_no: data.yes_no,
  yes_no_reversed: data.yes_no_reversed,
  keywords_upright: data.keywords_upright.join(", "),
  keywords_reversed: data.keywords_reversed.join(", "),
  meaning_upright: data.meaning_upright,
  meaning_reversed: data.meaning_reversed,
  love: data.love,
  love_reversed: data.love_reversed,
  career: data.career,
  career_reversed: data.career_reversed,
  mood: data.mood,
  mood_reversed: data.mood_reversed,
  spiritual: data.spiritual,
  spiritual_reversed: data.spiritual_reversed,
});

export type UpdateCardRequest = { name: string; arcana: Arcana; suit: Suit | ""; data: CardData };

/**
 * The API replaces cards.data wholesale and reads `suit: null` as "leave unchanged", so this keeps the data
 * keys the form doesn't cover, mirrors name, arcana and suit into data, and sends "" to clear the suit.
 */
export const toUpdateCardRequest = (card: CardDetail, values: z.output<typeof CardFormSchema>): UpdateCardRequest => ({
  name: values.name,
  arcana: values.arcana,
  suit: values.suit ?? "",
  data: { ...card.data, ...values },
});

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
