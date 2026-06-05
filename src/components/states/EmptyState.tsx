import { Button } from '@ui/Button';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ actionLabel, description, onAction, title }: EmptyStateProps) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <div className="grid max-w-sm gap-3">
        <h2 className="m-0 text-lg font-bold text-ink">{title}</h2>
        {description ? <p className="m-0 text-sm text-muted">{description}</p> : null}
        {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      </div>
    </div>
  );
}
