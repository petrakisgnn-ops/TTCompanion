import { useState } from 'react';
import { renderEntries } from '../rendering';
import type { Entry } from '../domain/reference/types';

interface CollapsibleFeatureProps {
  title: string;
  badge?: string;
  entries: Entry[];
}

/** A single named feature (race trait, background feature, class feature, ...) collapsed by default — tap to read its full text. */
export function CollapsibleFeature({ title, badge, entries }: CollapsibleFeatureProps) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;

  return (
    <div className="bg-[var(--color-raised)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-sm truncate">{title}</p>
          {badge && (
            <span className="shrink-0 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {badge}
            </span>
          )}
        </span>
        <span className="text-[var(--color-faint)] ml-2 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed text-[var(--color-text-2)] border-t border-[var(--color-border)] pt-3 space-y-1">
          {renderEntries(entries)}
        </div>
      )}
    </div>
  );
}
