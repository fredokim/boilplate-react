import type { SelectHTMLAttributes } from 'react';

export type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  options: SelectOption[];
};

export function Select({ className = '', error, hint, id, label, options, ...props }: SelectProps) {
  const selectId = id ?? props.name ?? label.toLowerCase().replaceAll(' ', '-');
  const descriptionId = `${selectId}-description`;

  return (
    <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={selectId}>
      {label}
      <select
        aria-describedby={hint || error ? descriptionId : undefined}
        aria-invalid={error ? true : undefined}
        className={[
          'h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-primary focus:shadow-focus',
          error ? 'border-danger' : '',
          className,
        ].join(' ')}
        id={selectId}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error || hint ? (
        <span className={error ? 'text-xs font-medium text-danger' : 'text-xs font-medium text-muted'} id={descriptionId}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
