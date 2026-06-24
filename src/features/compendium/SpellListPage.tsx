import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import type { StoredSpell } from '../../data/db';
import { CompendiumTabs } from './CompendiumTabs';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';

const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abj', C: 'Con', D: 'Div', E: 'Enc',
  V: 'Evo', I: 'Ill', N: 'Nec', T: 'Tra',
};

const LEVEL_LABELS = ['C', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const PAGE_SIZE = 80;

export function SpellListPage() {
  const navigate = useNavigate();
  const { edition } = useSettingsStore();
  const [allSpells, setAllSpells] = useState<StoredSpell[]>([]);
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.spells.orderBy('name').toArray().then(setAllSpells);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allSpells.filter(s => {
      if (!matchesEdition(s.source, (s as unknown as Record<string,unknown>).reprintedAs, edition)) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (levelFilter !== null && s.level !== levelFilter) return false;
      return true;
    });
  }, [allSpells, query, levelFilter, edition]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [query, levelFilter]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!hasMore || !bottomRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPage(p => p + 1); },
      { rootMargin: '200px' },
    );
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  function toggleLevel(lvl: number) {
    setLevelFilter(prev => (prev === lvl ? null : lvl));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10">
        <CompendiumTabs />
        <div className="px-4 pt-3 pb-2 space-y-2">

        {/* Search */}
        <input
          type="search"
          placeholder="Search spells…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500"
        />

        {/* Level chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {LEVEL_LABELS.map((lbl, lvl) => (
            <button
              key={lvl}
              onClick={() => toggleLevel(lvl)}
              className={`shrink-0 min-w-[2rem] h-8 rounded-full px-2 text-xs font-semibold transition-colors ${
                levelFilter === lvl
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Count */}
      <p className="px-4 py-1.5 text-xs text-slate-500">
        {filtered.length} spell{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* List */}
      <div className="divide-y divide-white/5">
        {visible.map(spell => (
          <button
            key={spell._key}
            onClick={() => navigate(`/spells/${encodeURIComponent(spell._key)}`)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors min-h-[3rem]"
          >
            <span className="font-medium text-sm">{spell.name}</span>
            <span className="text-xs text-slate-400 ml-2 shrink-0">
              {spell.level === 0 ? 'Cantrip' : `Lv ${spell.level}`}
              {' · '}
              {SCHOOL_NAMES[spell.school] ?? spell.school}
            </span>
          </button>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={bottomRef} className="h-8" />}

      {!hasMore && filtered.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-12">No spells found</p>
      )}
    </div>
  );
}
