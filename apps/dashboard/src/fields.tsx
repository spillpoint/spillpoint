// The editors' fields (M3c, M4j): a labelled text box, select or checkbox,
// with an optional hint and the engine's message under it when it names the
// field. The message is tied to the field for screen readers.

import type React from "react";

export interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  hint?: React.ReactNode | undefined;
  /** Visually hidden label, for fields in a table whose column says what they are. */
  hiddenLabel?: boolean | undefined;
  numeric?: boolean | undefined;
  /** "date" gives the browser's date picker, which reads and writes YYYY-MM-DD. */
  type?: "text" | "date" | undefined;
}

export function Field({ id, label, value, onChange, error, hint, hiddenLabel, numeric, type = "text" }: FieldProps) {
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id} className={hiddenLabel ? "visually-hidden" : "field__label"}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={numeric ? "num" : undefined}
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        spellCheck={false}
        autoComplete="off"
      />
      {hint && (
        <span id={`${id}-hint`} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  error: string | null;
  hint?: React.ReactNode | undefined;
  wide?: boolean | undefined;
}

export function SelectField({ id, label, value, options, onChange, error, hint, wide }: SelectFieldProps) {
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={wide ? "field field--wide" : "field"}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={described}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <span id={`${id}-hint`} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function CheckField({ id, label, checked, onChange, error, hint }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void; error: string | null; hint?: React.ReactNode | undefined }) {
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field field--wide">
      <label className="check">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={error ? true : undefined} aria-describedby={described} />
        {label}
      </label>
      {hint && (
        <span id={`${id}-hint`} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
