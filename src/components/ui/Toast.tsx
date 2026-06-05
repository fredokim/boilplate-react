type ToastTone = 'info' | 'success' | 'danger';

const toneClass: Record<ToastTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
};

type ToastProps = {
  title: string;
  message?: string | undefined;
  tone?: ToastTone;
};

export function Toast({ message, title, tone = 'info' }: ToastProps) {
  return (
    <div className={['rounded-md border p-4 shadow-sm', toneClass[tone]].join(' ')} role="status">
      <p className="m-0 text-sm font-bold">{title}</p>
      {message ? <p className="m-0 mt-1 text-sm">{message}</p> : null}
    </div>
  );
}
