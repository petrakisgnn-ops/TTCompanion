import { useState } from 'react';
import { renderEntries } from '../../rendering';
import type { FeatureChoice } from '../../domain/reference/classFeatures';

interface FeatureChoiceListProps {
  choices: FeatureChoice[];
  onChange: (choiceId: string, optionIds: string[]) => void;
  /** Show the class name next to each choice (multiclass sheets). */
  showClass?: boolean;
}

/**
 * "Choose one of these features" picker (2024 Divine Order / Primal Order / Blessed Strikes,
 * Totem Spirit, Hunter's Prey, …). Shared by the creation wizard and the sheet's Features tab;
 * it only renders and reports picks — the caller decides where they're stored.
 */
export function FeatureChoiceList({ choices, onChange, showClass = false }: FeatureChoiceListProps) {
  // Which option descriptions are open. Chosen options start open.
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (choices.length === 0) return null;

  const toggleOpen = (key: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <div className="space-y-3">
      {choices.map(choice => {
        const need = Math.min(choice.count, choice.options.length);
        const pending = choice.chosen.length < need;

        const pick = (optionId: string) => {
          const has = choice.chosen.includes(optionId);
          if (need === 1) { onChange(choice.id, has ? [] : [optionId]); return; }
          if (has) onChange(choice.id, choice.chosen.filter(id => id !== optionId));
          else if (choice.chosen.length < need) onChange(choice.id, [...choice.chosen, optionId]);
        };

        return (
          <div
            key={choice.id}
            className={`bg-[var(--color-card)] rounded-xl overflow-hidden border ${
              pending ? 'border-amber-500/50' : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{choice.featureName}</p>
                <p className="text-xs text-[var(--color-faint)]">
                  {showClass ? `${choice.className} · ` : ''}Level {choice.level} · Choose {need}
                </p>
              </div>
              {pending ? (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">
                  Choose
                </span>
              ) : (
                <span className="shrink-0 text-xs text-emerald-400">✓</span>
              )}
            </div>

            <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {choice.options.map(opt => {
                const selected = choice.chosen.includes(opt.id);
                const key = `${choice.id}>${opt.id}`;
                const isOpen = open.has(key) !== selected; // chosen = open by default; tap chevron to flip
                const blocked = !selected && need > 1 && choice.chosen.length >= need;
                return (
                  <div key={opt.id} className={selected ? 'bg-amber-500/10' : ''}>
                    <div className="flex items-stretch">
                      <button
                        onClick={() => pick(opt.id)}
                        disabled={blocked}
                        className="flex-1 flex items-center gap-3 px-4 min-h-[44px] text-left disabled:opacity-40"
                        aria-pressed={selected}
                      >
                        <span
                          className={`w-4 h-4 shrink-0 border-2 transition-colors ${need === 1 ? 'rounded-full' : 'rounded'} ${
                            selected ? 'bg-amber-500 border-amber-500' : 'border-slate-500'
                          }`}
                        />
                        <span className={`text-sm ${selected ? 'font-semibold text-amber-400' : ''}`}>{opt.name}</span>
                      </button>
                      <button
                        onClick={() => toggleOpen(key)}
                        className="px-4 min-w-[44px] text-xs text-[var(--color-faint)] hover:text-[var(--color-text)]"
                        aria-label={isOpen ? `Hide ${opt.name} details` : `Show ${opt.name} details`}
                      >
                        {isOpen ? '▲' : '▼'}
                      </button>
                    </div>
                    {isOpen && opt.entries.length > 0 && (
                      <div className="px-4 pb-3 text-sm leading-relaxed text-[var(--color-text-2)]">
                        {renderEntries(opt.entries, key)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
