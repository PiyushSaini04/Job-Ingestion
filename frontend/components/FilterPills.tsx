import React from 'react';

interface Props {
  label: string;
  items: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function FilterPills({ label, items, selected, onChange }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">{label}</h2>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-[color:var(--accent)] transition hover:text-[color:var(--accent-hover)]"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(active ? selected.filter((value) => value !== item) : [...selected, item])}
              className={[
                'ui-chip rounded-full border px-4 py-2 text-sm font-medium',
                active
                  ? 'border-[color:color-mix(in_srgb,var(--accent)_42%,var(--border))] bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-[color:var(--text-primary)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_18%,transparent)]'
                  : 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:border-[color:color-mix(in_srgb,var(--accent)_34%,var(--border))] hover:text-[color:var(--text-primary)]'
              ].join(' ')}
            >
              {item}
            </button>
          );
        })}
      </div>
    </section>
  );
}
