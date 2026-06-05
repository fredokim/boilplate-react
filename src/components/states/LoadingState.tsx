export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-white p-8 text-sm font-semibold text-muted">
      <span className="inline-flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
        {label}
      </span>
    </div>
  );
}
