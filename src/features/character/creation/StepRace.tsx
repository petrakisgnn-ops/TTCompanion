import { useEffect, useMemo, useState } from 'react';
import type { WizardData } from './CharacterWizard';

interface RaceEntry {
  name: string;
  source: string;
  size?: string[];
  speed?: number | { walk?: number; fly?: number; swim?: number };
}

interface StepRaceProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

export function StepRace({ data, patch }: StepRaceProps) {
  const [races, setRaces] = useState<RaceEntry[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: { race: RaceEntry[] }) => {
        // PHB/SRD first, then alphabetical
        const sorted = [...json.race].sort((a, b) => {
          const aPhb = a.source === 'PHB' ? 0 : 1;
          const bPhb = b.source === 'PHB' ? 0 : 1;
          return aPhb - bPhb || a.name.localeCompare(b.name);
        });
        setRaces(sorted);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? races.filter(r => r.name.toLowerCase().includes(q)) : races;
  }, [races, query]);

  const selectedKey = data.raceRef ? `${data.raceRef.name}|${data.raceRef.source}` : null;

  return (
    <div className="pb-4">
      <div className="px-4 py-3 space-y-2">
        <h2 className="text-base font-semibold">Choose a Race</h2>
        <input
          type="search"
          placeholder="Search races…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-[var(--color-card)] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[var(--color-faint)] outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)]"
        />
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {filtered.map(r => {
          const key = `${r.name}|${r.source}`;
          const selected = selectedKey === key;
          return (
            <button
              key={key}
              onClick={() => patch({ raceRef: { name: r.name, source: r.source } })}
              className={`w-full flex items-center justify-between px-4 py-3 text-left min-h-[3rem] transition-colors ${
                selected
                  ? 'bg-amber-500/10 border-l-2 border-amber-500'
                  : 'hover:bg-white/5 active:bg-white/10'
              }`}
            >
              <span className={`font-medium text-sm ${selected ? 'text-amber-400' : ''}`}>
                {r.name}
              </span>
              <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">{r.source}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
