import { useTranslation } from "react-i18next";

type Props<T extends string> = {
  legend: string;
  /** Radio group name; unique within the form. */
  name: string;
  options: readonly T[];
  value: T | null;
  label: (option: T) => string;
  onChange: (value: T) => void;
  /** A message key under "validation". */
  error?: string;
};

/** Radio buttons styled as chips, for picking one of a few values. */
export function ChoiceChips<T extends string>({ legend, name, options, value, label, onChange, error }: Props<T>) {
  const { t } = useTranslation();

  return (
    <fieldset className="field">
      <legend className="field__label">{legend}</legend>
      <div className="chips">
        {options.map((option) => (
          <label key={option} className="chip">
            <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
            <span>{label(option)}</span>
          </label>
        ))}
      </div>
      {error && <span className="field__error">{t(`validation.${error}`)}</span>}
    </fieldset>
  );
}
