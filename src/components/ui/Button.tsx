import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
  }
>;

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-blue-700',
  secondary: 'border border-line bg-white text-ink hover:bg-slate-50',
  ghost: 'bg-transparent text-muted hover:bg-slate-100 hover:text-ink',
  danger: 'bg-danger text-white hover:bg-red-700',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export function Button({
  children,
  className = '',
  disabled,
  isLoading = false,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:opacity-55',
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(' ')}
      disabled={disabled ?? isLoading}
      type={type}
      {...props}
    >
      {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {children}
    </button>
  );
}
