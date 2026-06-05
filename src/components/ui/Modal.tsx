import { Button } from './Button';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string | undefined;
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ children, description, onClose, open, title }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="dialog">
      <section className="w-full max-w-lg rounded-lg border border-line bg-white p-5 shadow-xl">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-lg font-bold text-ink">{title}</h2>
            {description ? <p className="m-0 mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <Button aria-label="Close modal" onClick={onClose} size="sm" variant="ghost">
            X
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
