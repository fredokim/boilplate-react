type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
};

export function Tabs({ activeId, items, onChange }: TabsProps) {
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div className="grid gap-4">
      <div aria-label="Tabs" className="flex flex-wrap gap-2" role="tablist">
        {items.map((item) => (
          <button
            aria-selected={item.id === activeId}
            className={[
              'h-9 rounded-md px-3 text-sm font-bold transition',
              item.id === activeId ? 'bg-primary text-white' : 'bg-slate-100 text-muted hover:text-ink',
            ].join(' ')}
            key={item.id}
            onClick={() => onChange(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="rounded-md border border-line bg-white p-4" role="tabpanel">
        {activeItem?.content}
      </div>
    </div>
  );
}
