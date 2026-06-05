import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}>;

export function Card({ action, children, className = '', description, title }: CardProps) {
  return (
    <section className={['rounded-lg border border-line bg-white p-5 shadow-sm', className].join(' ')}>
      {title || description || action ? (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="m-0 text-lg font-bold text-ink">{title}</h2> : null}
            {description ? <p className="m-0 mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
