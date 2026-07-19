import { useEffect, useMemo, useState } from 'react';
import type { WizardData } from './CharacterWizard';
import { renderEntries } from '../../../rendering';
import type { Entry } from '../../../domain/reference/types';

interface BgEntry {
  name: string;
  source: string;
  skillProficiencies?: Record<string, boolean>[];
  entries?: Entry[];
}

interface StepBackgroundProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

function skillSummary(bg: BgEntry): string {
  const profs = bg.skillProficiencies?.[0];
  if (!profs) return '';
  return Object.entries(profs)
    .filter(([, v]) => v === true)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(', ');
}

export function StepBackground({ data, patch }: StepBackgroundProps) {
  const [backgrounds, setBackgrounds] = useState<BgEntry[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`)
      .then(r => r.json())
      .then((json: { background: BgEntry[] }) => {
        const sorted = [...json.background].sort((a, b) => {
          const aPhb = a.source === 'PHB' ? 0 : 1;
          const bPhb = b.source === 'PHB' ? 0 : 1;
          return aPhb - bPhb || a.name.localeCompare(b.name);
        });
        setBackgrounds(sorted);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? backgrounds.filter(b => b.name.toLowerCase().includes(q)) : backgrounds;
  }, [backgrounds, query]);

  const selectedKey = data.backgroundRef
    ? `${data.backgroundRef.name}|${data.backgroundRef.source}`
    : null;

  const selected = selectedKey ? backgrounds.find(bg => `${bg.name}|${bg.source}` === selectedKey) : null;

  return (
    <div className="pb-4">
      <div className="px-4 py-3 space-y-2">
        <h2 className="text-base font-semibold">Choose a Background</h2>
        <input
          type="search"
          placeholder="Search backgrounds…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-[var(--color-card)] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[var(--color-faint)] outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)]"
        />
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {filtered.map(bg => {
          const key = `${bg.name}|${bg.source}`;
          const selected = selectedKey === key;
          const skills = skillSummary(bg);
          return (
            <button
              key={key}
              onClick={() => patch({ backgroundRef: { name: bg.name, source: bg.source } })}
              className={`w-full flex items-center justify-between px-4 py-3 text-left min-h-[3rem] transition-colors ${
                selected
                  ? 'bg-amber-500/10 border-l-2 border-amber-500'
                  : 'hover:bg-white/5 active:bg-white/10'
              }`}
            >
              <div>
                <p className={`font-medium text-sm ${selected ? 'text-amber-400' : ''}`}>
                  {bg.name}
                </p>
                {skills && (
                  <p className="text-xs text-[var(--color-faint)]">{skills}</p>
                )}
              </div>
              <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">{bg.source}</span>
            </button>
          );
        })}
      </div>

      {selected && selected.entries && selected.entries.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-[var(--color-card)] rounded-xl text-sm leading-relaxed text-[var(--color-text-2)] space-y-1">
          {renderEntries(selected.entries)}
        </div>
      )}
    </div>
  );
}
