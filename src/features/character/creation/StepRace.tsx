import { useEffect, useMemo, useState } from 'react';
import type { WizardData } from './CharacterWizard';
import { buildRaceOptions, type RaceOption, type RawRace, type RawSubrace } from '../../../domain/reference/races';
import { renderEntries } from '../../../rendering';

interface StepRaceProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

export function StepRace({ data, patch }: StepRaceProps) {
  const [options, setOptions] = useState<RaceOption[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: { race: RawRace[]; subrace: RawSubrace[] }) => {
        const built = buildRaceOptions(json.race, json.subrace);
        // PHB/SRD first, then alphabetical
        const sorted = [...built].sort((a, b) => {
          const aPhb = a.source === 'PHB' ? 0 : 1;
          const bPhb = b.source === 'PHB' ? 0 : 1;
          return aPhb - bPhb || a.name.localeCompare(b.name);
        });
        setOptions(sorted);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? options.filter(o => o.name.toLowerCase().includes(q) || o.raceName.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const selectedKey = data.raceRef
    ? `${data.subraceRef?.name ?? data.raceRef.name}|${data.subraceRef?.source ?? data.raceRef.source}::${data.raceRef.name}|${data.raceRef.source}`
    : null;

  const selected = data.raceRef
    ? filtered.find(o => `${o.subraceName ?? o.raceName}|${o.subraceSource ?? o.raceSource}::${o.raceName}|${o.raceSource}` === selectedKey)
    : null;

  const choose = (opt: RaceOption) =>
    patch({
      raceRef: { name: opt.raceName, source: opt.raceSource },
      subraceRef: opt.subraceName && opt.subraceSource
        ? { name: opt.subraceName, source: opt.subraceSource }
        : null,
    });

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
        {filtered.map(opt => {
          const isSelected = selectedKey === `${opt.subraceName ?? opt.raceName}|${opt.subraceSource ?? opt.raceSource}::${opt.raceName}|${opt.raceSource}`;
          return (
            <button
              key={opt.key}
              onClick={() => choose(opt)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left min-h-[3rem] transition-colors ${
                isSelected
                  ? 'bg-amber-500/10 border-l-2 border-amber-500'
                  : 'hover:bg-white/5 active:bg-white/10'
              }`}
            >
              <span>
                <span className={`font-medium text-sm ${isSelected ? 'text-amber-400' : ''}`}>
                  {opt.name}
                </span>
                {opt.subraceName && (
                  <span className="text-xs text-[var(--color-faint)] ml-1.5">({opt.raceName})</span>
                )}
              </span>
              <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">{opt.source}</span>
            </button>
          );
        })}
      </div>

      {selected && selected.entries.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-[var(--color-card)] rounded-xl text-sm leading-relaxed text-[var(--color-text-2)] space-y-1">
          {renderEntries(selected.entries)}
        </div>
      )}
    </div>
  );
}
