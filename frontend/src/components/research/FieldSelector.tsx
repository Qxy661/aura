interface ResearchField {
  id: number;
  name: string;
  name_en: string;
  icon: string;
  is_active: boolean;
}

interface FieldSelectorProps {
  fields: ResearchField[];
  selectedId: number | null;
  onSelect: (fieldId: number) => void;
}

export function FieldSelector({ fields, selectedId, onSelect }: FieldSelectorProps) {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {fields.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f.id)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all border-2 ${
            selectedId === f.id
              ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
              : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]"
          }`}
        >
          <span>{f.icon}</span>
          <span>{f.name}</span>
        </button>
      ))}
    </div>
  );
}
