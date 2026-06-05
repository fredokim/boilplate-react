import type { InputHTMLAttributes } from 'react';

type RadioOption = {
  label: string;
  value: string;
  description?: string | undefined;
};

type RadioGroupProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  name: string;
  options: RadioOption[];
  value?: string | undefined;
};

export function RadioGroup({ label, name, onChange, options, value, ...props }: RadioGroupProps) {
  return (
    <fieldset className="grid gap-3 rounded-md border border-line p-4">
      <legend className="px-1 text-sm font-bold text-ink">{label}</legend>
      {options.map((option) => (
        <label className="flex items-start gap-3 text-sm text-ink" htmlFor={`${name}-${option.value}`} key={option.value}>
          <input
            checked={value === option.value}
            className="mt-1 h-4 w-4 border-line text-primary focus:shadow-focus"
            id={`${name}-${option.value}`}
            name={name}
            onChange={onChange}
            type="radio"
            value={option.value}
            {...props}
          />
          <span className="grid gap-1">
            <span className="font-semibold">{option.label}</span>
            {option.description ? <span className="text-xs font-medium text-muted">{option.description}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
