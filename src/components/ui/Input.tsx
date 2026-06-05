import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export function Input({ className = '', error, hint, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replaceAll(' ', '-');
  const descriptionId = `${inputId}-description`;

  return (
    <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={inputId}>
      {label}
      <input
        aria-describedby={hint || error ? descriptionId : undefined}
        aria-invalid={error ? true : undefined}
        className={[
          'h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:shadow-focus',
          error ? 'border-danger' : '',
          className,
        ].join(' ')}
        id={inputId}
        {...props}
      />
      {error || hint ? (
        <span className={error ? 'text-xs font-medium text-danger' : 'text-xs font-medium text-muted'} id={descriptionId}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
