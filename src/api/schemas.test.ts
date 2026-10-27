import {
  CardDetailSchema,
  CardFormSchema,
  OllamaFormSchema,
  SettingSchema,
  SettingValueFormSchema,
  newSettingSchema,
  toCardForm,
  type CardDetail,
} from "@/api/schemas";

// As Tarot.Admin.Api sends a card: every field, in camelCase.
const fiveOfCups = {
  id: 40,
  name: "Five of Cups",
  arcana: "minor",
  suit: "cups",
  numberNumerology: 5,
  element: "Water",
  planet: "Mars",
  zodiac: "Scorpio",
  yesNo: "no",
  yesNoReversed: "yes",
  keywordsUpright: ["loss", "grief", "regret", "focusing on what's gone", "disappointment"],
  keywordsReversed: ["acceptance", "moving on", "forgiveness", "seeing what remains", "healing"],
  meaningUpright: "Loss, grief, regret, focusing on what's gone, disappointment.",
  meaningReversed: "Acceptance, moving on, forgiveness, seeing what remains, healing.",
  love: "heartbreak, regret in love, grieving a relationship, focusing on emotional loss",
  loveReversed: "acceptance, moving on, forgiveness, healing",
  career: "professional disappointment, missed opportunity, career regret, learning from setbacks",
  careerReversed: "moving on from setbacks, acceptance, learning from loss, recovery",
  mood: "Sorrowful, regretful.",
  moodReversed: "healing, accepting, lighter",
  spiritual: "spiritual lessons through grief, acceptance of loss, emotional release, noticing what remains",
  spiritualReversed: "acceptance, forgiveness, seeing what remains, emotional healing",
};

const card = (): CardDetail => CardDetailSchema.parse(structuredClone(fiveOfCups));

describe("CardDetailSchema", () => {
  it("parses a card as the API sends it", () => {
    expect(card()).toEqual(fiveOfCups);
  });

  it("rejects an arcana outside the dataset", () => {
    expect(CardDetailSchema.safeParse({ ...fiveOfCups, arcana: "Minor" }).success).toBe(false);
  });
});

describe("CardFormSchema", () => {
  it("round-trips a stored card into the update request unchanged", () => {
    const { id: _id, ...request } = fiveOfCups;
    expect(CardFormSchema.parse(toCardForm(card()))).toEqual(request);
  });

  it("splits and trims keywords, and requires at least one", () => {
    const form = { ...toCardForm(card()), keywordsUpright: " loss,  grief ,, " };
    expect(CardFormSchema.parse(form).keywordsUpright).toEqual(["loss", "grief"]);
    expect(CardFormSchema.safeParse({ ...form, keywordsUpright: " , " }).error?.issues[0].message).toBe(
      "keywordsRequired",
    );
  });

  it("stores an empty planet as null and requires a whole number", () => {
    const form = { ...toCardForm(card()), planet: "  " };
    expect(CardFormSchema.parse(form).planet).toBeNull();
    expect(CardFormSchema.safeParse({ ...form, numberNumerology: "5.5" }).success).toBe(false);
  });

  it("requires a suit for the Minor Arcana and sends null for the Major", () => {
    const form = toCardForm(card());
    expect(CardFormSchema.safeParse({ ...form, suit: null }).error?.issues).toMatchObject([
      { path: ["suit"], message: "suitRequired" },
    ]);
    expect(CardFormSchema.parse({ ...form, arcana: "major" }).suit).toBeNull();
  });

  it("trims the name it sends", () => {
    expect(CardFormSchema.parse({ ...toCardForm(card()), name: "  5 of Cups " }).name).toBe("5 of Cups");
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
