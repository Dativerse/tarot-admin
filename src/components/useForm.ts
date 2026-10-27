import { useState } from "react";
import type { z } from "zod";

/**
 * Form values checked against `schema` on submit. `dirty` compares them with `initial`, so remount the form
 * (with a `key`) when the saved values change.
 */
export function useForm<T extends object, R>(schema: z.ZodType<R, T>, initial: T) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }));
  const dirty = (Object.keys(initial) as (keyof T)[]).some((key) => values[key] !== initial[key]);

  const reset = () => {
    setValues(initial);
    setErrors({});
  };

  /** Returns the parsed values, or shows the first message for each invalid field and returns undefined. */
  const validate = (): R | undefined => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }
    const next: Partial<Record<keyof T, string>> = {};
    for (const issue of parsed.error.issues) next[issue.path[0] as keyof T] ??= issue.message;
    setErrors(next);
    return undefined;
  };

  return { values, setValues, set, errors, invalid: Object.keys(errors).length > 0, dirty, reset, validate };
}
