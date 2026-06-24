import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../data/db';
import type { StoredMonster } from '../../data/db';
import { crStr } from '../../domain/reference/types';
import { useCharacterStore } from '../../stores/characterStore';
import { totalLevel } from '../../domain/rules';

// XP thresholds per character level [Easy, Medium, Hard, Deadly]
const XP_THRESHOLDS: readonly number[][] = [
  [25, 50, 75, 100],
  [50, 100, 150, 200],
  [75, 150, 225, 400],
  [125, 250, 375, 500],
  [250, 500, 750, 1100],
  [300, 600, 900, 1400],
  [350, 750, 1100, 1700],
  [450, 900, 1400, 2100],
  [550, 1100, 1600, 2400],
  [600, 1200, 1900, 2800],
  [800, 1600, 2400, 3600],
  [1000, 2000, 3000, 4500],
  [1100, 2200, 3400, 5100],
  [1250, 2500, 3800, 5700],
  [1400, 2800, 4300, 6400],
  [1600, 3200, 4800, 7200],
  [2000, 3900, 5900, 8800],
  [2100, 4200, 6300, 9500],
  [2400, 4900, 7300, 10900],
  [2800, 5700, 8500, 12700],
];

// CR → XP (approximate 5e values)
const CR_XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '30': 155000,
};

function monsterXp(cr: StoredMonster['cr']): number {
  const crString = typeof cr === 'string' ? cr : (cr as { cr: string }).cr ?? '0';
  return CR_XP[crString] ?? 0;
}

// XP multiplier based on monster count (DMG table)
function xpMultiplier(count: number): number {
  if (count === 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

interface EncounterMonster {
  monster: StoredMonster;
  count: number;
}

const DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard', 'Deadly'] as const;
const DIFFICULTY_COLORS = ['text-emerald-400', 'text-amber-400', 'text-orange-400', 'text-red-400'];

export function EncounterBuilder() {
  const { characters, loaded, load } = useCharacterStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredMonster[]>([]);
  const [encounter, setEncounter] = useState<EncounterMonster[]>([]);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!query.trim()) { setResults([]); return; }
    searchRef.current = setTimeout(async () => {
      const q = query.toLowerCase();
      const all = await db.monsters.orderBy('name').toArray();
      setResults(all.filter(m => m.name.toLowerCase().includes(q)).slice(0, 20));
    }, 200);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query]);

  const addMonster = (monster: StoredMonster) => {
    setEncounter(enc => {
      const idx = enc.findIndex(e => e.monster._key === monster._key);
      if (idx >= 0) {
        const next = [...enc];
        next[idx] = { ...next[idx], count: next[idx].count + 1 };
        return next;
      }
      return [...enc, { monster, count: 1 }];
    });
    setQuery('');
    setResults([]);
  };

  const changeCount = (key: string, delta: number) => {
    setEncounter(enc =>
      enc
        .map(e => e.monster._key === key ? { ...e, count: e.count + delta } : e)
        .filter(e => e.count > 0),
    );
  };

  // Budget calculation
  const { budget, adjusted, difficulty, diffIdx } = useMemo(() => {
    if (!loaded) return { budget: [0, 0, 0, 0], adjusted: 0, difficulty: 'Easy', diffIdx: -1 };

    const levels = characters.map(c => totalLevel(c.classes));
    const budget = [0, 0, 0, 0];
    for (const lvl of levels) {
      const thresholds = XP_THRESHOLDS[Math.min(lvl, 20) - 1] ?? XP_THRESHOLDS[0];
      for (let i = 0; i < 4; i++) budget[i] += thresholds[i];
    }

    const totalBaseXp = encounter.reduce(
      (sum, e) => sum + monsterXp(e.monster.cr) * e.count,
      0,
    );
    const totalCount = encounter.reduce((sum, e) => sum + e.count, 0);
    const adjusted = Math.round(totalBaseXp * xpMultiplier(totalCount));

    let diffIdx = -1;
    if (adjusted >= budget[3]) diffIdx = 3;
    else if (adjusted >= budget[2]) diffIdx = 2;
    else if (adjusted >= budget[1]) diffIdx = 1;
    else if (adjusted >= budget[0]) diffIdx = 0;

    return { budget, adjusted, difficulty: DIFFICULTY_LABELS[diffIdx] ?? '—', diffIdx };
  }, [encounter, characters, loaded]);

  return (
    <div className="p-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search bestiary to add monsters…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500"
        />
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 bg-slate-800 border border-white/10 rounded-xl mt-1 overflow-hidden shadow-xl">
            {results.map(m => (
              <button
                key={m._key}
                onClick={() => addMonster(m)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 text-sm"
              >
                <span>{m.name}</span>
                <span className="text-slate-500 text-xs">CR {crStr(m.cr)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Encounter list */}
      {encounter.length > 0 && (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Encounter</p>
          </div>
          {encounter.map(({ monster, count }) => (
            <div
              key={monster._key}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{monster.name}</p>
                <p className="text-xs text-slate-500">
                  CR {crStr(monster.cr)} · {monsterXp(monster.cr) * count} XP
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => changeCount(monster._key, -1)}
                  className="w-7 h-7 rounded bg-slate-700 font-bold hover:bg-slate-600 flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-5 text-center font-semibold text-sm">{count}</span>
                <button
                  onClick={() => changeCount(monster._key, 1)}
                  className="w-7 h-7 rounded bg-slate-700 font-bold hover:bg-slate-600 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* XP Budget */}
      {characters.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Party Budget ({characters.length} characters)
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {DIFFICULTY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`rounded-lg p-2 text-center ${
                  i === diffIdx ? 'bg-slate-700 ring-1 ring-amber-500' : 'bg-slate-700/40'
                }`}
              >
                <p className={`text-xs font-semibold ${DIFFICULTY_COLORS[i]}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{budget[i].toLocaleString()}</p>
              </div>
            ))}
          </div>

          {encounter.length > 0 && (
            <div className="border-t border-white/10 pt-2 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-slate-400">Adjusted XP: </span>
                <span className="font-bold">{adjusted.toLocaleString()}</span>
              </div>
              <span className={`text-sm font-bold ${
                diffIdx >= 0 ? DIFFICULTY_COLORS[diffIdx] : 'text-slate-400'
              }`}>
                {diffIdx >= 0 ? difficulty : 'Trivial'}
              </span>
            </div>
          )}
        </div>
      )}

      {encounter.length > 0 && (
        <button
          onClick={() => setEncounter([])}
          className="text-xs text-slate-600 hover:text-red-400 transition-colors"
        >
          Clear encounter
        </button>
      )}
    </div>
  );
}
