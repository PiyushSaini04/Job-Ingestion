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
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</h2>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-sky-300 transition hover:text-sky-200"
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
                'rounded-full border px-4 py-2 text-sm transition',
                active
                  ? 'border-sky-300 bg-sky-300/20 text-sky-50 shadow-glow'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-300/50 hover:bg-sky-300/10'
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
