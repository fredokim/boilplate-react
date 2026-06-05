import type { InputHTMLAttributes } from 'react';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  description?: string | undefined;
};

export function Checkbox({ description, id, label, ...props }: CheckboxProps) {
  const checkboxId = id ?? props.name ?? label.toLowerCase().replaceAll(' ', '-');

  return (
    <label className="flex items-start gap-3 text-sm text-ink" htmlFor={checkboxId}>
      <input
        className="mt-1 h-4 w-4 rounded border-line text-primary focus:shadow-focus"
        id={checkboxId}
        type="checkbox"
        {...props}
      />
      <span className="grid gap-1">
        <span className="font-semibold">{label}</span>
        {description ? <span className="text-xs font-medium text-muted">{description}</span> : null}
      </span>
    </label>
  );
}
