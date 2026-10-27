import { describe, expect, it } from "vitest";
import {
  CardDetailSchema,
  CardFormSchema,
  OllamaFormSchema,
  SettingSchema,
  SettingValueFormSchema,
  newSettingSchema,
  toCardForm,
  toUpdateCardRequest,
  type CardDetail,
} from "@/api/schemas";

// Shapes as Tarot.Admin.Api sends them: columns in camelCase, cards.data with the dataset's snake_case keys.
const fiveOfCups = {
  id: 40,
  name: "Five of Cups",
  arcana: "minor",
  suit: "cups",
  data: {
    id: 40,
    name: "Five of Cups",
    arcana: "minor",
    suit: "cups",
    number_numerology: 5,
    element: "Water",
    planet: "Mars",
    zodiac: "Scorpio",
    yes_no: "no",
    yes_no_reversed: "yes",
    keywords_upright: ["loss", "grief", "regret", "focusing on what's gone", "disappointment"],
    keywords_reversed: ["acceptance", "moving on", "forgiveness", "seeing what remains", "healing"],
    meaning_upright: "Loss, grief, regret, focusing on what's gone, disappointment.",
    meaning_reversed: "Acceptance, moving on, forgiveness, seeing what remains, healing.",
    love: "heartbreak, regret in love, grieving a relationship, focusing on emotional loss",
    love_reversed: "acceptance, moving on, forgiveness, healing",
    career: "professional disappointment, missed opportunity, career regret, learning from setbacks",
    career_reversed: "moving on from setbacks, acceptance, learning from loss, recovery",
    mood: "Sorrowful, regretful.",
    mood_reversed: "healing, accepting, lighter",
    spiritual: "spiritual lessons through grief, acceptance of loss, emotional release, noticing what remains",
    spiritual_reversed: "acceptance, forgiveness, seeing what remains, emotional healing",
    image_credit: "RWS 1909",
  },
};

const card = (): CardDetail => CardDetailSchema.parse(structuredClone(fiveOfCups));

describe("CardDetailSchema", () => {
  it("parses a card as the API sends it and keeps data keys it doesn't know", () => {
    expect(card().data.image_credit).toBe("RWS 1909");
  });

  it("rejects an arcana outside the dataset", () => {
    expect(CardDetailSchema.safeParse({ ...fiveOfCups, arcana: "Minor" }).success).toBe(false);
  });
});

describe("CardFormSchema", () => {
  it("round-trips a stored card unchanged", () => {
    const values = CardFormSchema.parse(toCardForm(card()));
    expect(toUpdateCardRequest(card(), values).data).toEqual(fiveOfCups.data);
  });

  it("splits and trims keywords, and requires at least one", () => {
    const form = { ...toCardForm(card()), keywords_upright: " loss,  grief ,, " };
    expect(CardFormSchema.parse(form).keywords_upright).toEqual(["loss", "grief"]);
    expect(CardFormSchema.safeParse({ ...form, keywords_upright: " , " }).error?.issues[0].message).toBe(
      "keywordsRequired",
    );
  });

  it("stores an empty planet as null and requires a whole number", () => {
    const form = { ...toCardForm(card()), planet: "  " };
    expect(CardFormSchema.parse(form).planet).toBeNull();
    expect(CardFormSchema.safeParse({ ...form, number_numerology: "5.5" }).success).toBe(false);
  });

  it("requires a suit for the Minor Arcana and drops it for the Major", () => {
    const form = toCardForm(card());
    expect(CardFormSchema.safeParse({ ...form, suit: null }).error?.issues).toMatchObject([
      { path: ["suit"], message: "suitRequired" },
    ]);
    expect(CardFormSchema.parse({ ...form, arcana: "major" }).suit).toBeNull();
  });
});

describe("toUpdateCardRequest", () => {
  it("clears the suit with an empty string, since null means unchanged", () => {
    const values = CardFormSchema.parse({ ...toCardForm(card()), arcana: "major", suit: null });
    const request = toUpdateCardRequest(card(), values);
    expect(request.suit).toBe("");
    expect(request.data.suit).toBeNull();
  });

  it("mirrors the edited name into data and keeps the id", () => {
    const values = CardFormSchema.parse({ ...toCardForm(card()), name: "  5 of Cups " });
    const request = toUpdateCardRequest(card(), values);
    expect(request.name).toBe("5 of Cups");
    expect(request.data).toMatchObject({ id: 40, name: "5 of Cups", image_credit: "RWS 1909" });
  });
});

describe("SettingSchema", () => {
  it("parses a stored setting with its JSON text value", () => {
    const setting = SettingSchema.parse({
      name: "ollama:model",
      value: '"llama3.2:3b"',
      description: "Model to use for readings",
      updatedAt: "2026-10-26T10:07:24.281976+00:00",
    });
    expect(JSON.parse(setting.value)).toBe("llama3.2:3b");
  });
});

describe("SettingValueFormSchema", () => {
  it("sends the parsed JSON value", () => {
    expect(SettingValueFormSchema.parse({ value: " 0.3 ", description: "" }).value).toBe(0.3);
    expect(SettingValueFormSchema.parse({ value: '"Exact"', description: "" }).value).toBe("Exact");
  });

  it("rejects a bare string", () => {
    expect(SettingValueFormSchema.safeParse({ value: "Exact", description: "" }).error?.issues[0].message).toBe(
      "valueInvalidJson",
    );
  });
});

describe("newSettingSchema", () => {
  const schema = newSettingSchema(["ollama:model"]);
  const nameError = (name: string) => schema.safeParse({ name, value: "1", description: "" }).error?.issues[0].message;

  it("accepts names like the built-in ones", () => {
    expect(nameError("feature:streaming.enabled")).toBeUndefined();
  });

  it("rejects names the routes can't address or that already exist", () => {
    expect(nameError("a/b")).toBe("nameInvalid");
    expect(nameError("Deck")).toBe("nameReserved");
    expect(nameError("ollama:model")).toBe("nameTaken");
  });
});

describe("OllamaFormSchema", () => {
  it("accepts service hostnames and converts the timeout", () => {
    const form = { baseUrl: "http://ollama:11434/v1", model: "llama3.2:3b", timeoutSeconds: "300" };
    expect(OllamaFormSchema.parse(form).timeoutSeconds).toBe(300);
    expect(OllamaFormSchema.safeParse({ ...form, baseUrl: "ollama:11434" }).success).toBe(false);
    expect(OllamaFormSchema.safeParse({ ...form, timeoutSeconds: "0" }).success).toBe(false);
  });
});
