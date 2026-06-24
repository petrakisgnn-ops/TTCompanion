import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import type { StoredMonster } from '../../data/db';
import { monsterTypeStr, crStr, parseCr } from '../../domain/reference/types';
import { CompendiumTabs } from './CompendiumTabs';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';

const PAGE_SIZE = 80;

function crSortKey(m: StoredMonster): number {
  return parseCr(m.cr);
}

type SortKey = 'name' | 'cr';

export function BestiaryListPage() {
  const navigate = useNavigate();
  const { edition } = useSettingsStore();
  const [allMonsters, setAllMonsters] = useState<StoredMonster[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [page, setPage] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.monsters.orderBy('name').toArray().then(setAllMonsters);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const result = allMonsters.filter(m => {
      if (!matchesEdition(m.source, (m as unknown as Record<string,unknown>).reprintedAs, edition)) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === 'cr') {
      result.sort((a, b) => crSortKey(a) - crSortKey(b) || a.name.localeCompare(b.name));
    }
    return result;
  }, [allMonsters, query, sort, edition]);

  useEffect(() => { setPage(1); }, [query, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  useEffect(() => {
    if (!hasMore || !bottomRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPage(p => p + 1); },
      { rootMargin: '200px' },
    );
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10">
        <CompendiumTabs />
        <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Bestiary</h1>
          <div className="flex gap-1 text-xs">
            {(['name', 'cr'] as SortKey[]).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2 py-1 rounded ${
                  sort === s ? 'bg-amber-500 text-slate-900 font-semibold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {s === 'name' ? 'A–Z' : 'CR'}
              </button>
            ))}
          </div>
        </div>

        <input
          type="search"
          placeholder="Search monsters…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500"
        />
        </div>
      </div>

      <p className="px-4 py-1.5 text-xs text-slate-500">
        {filtered.length} monster{filtered.length !== 1 ? 's' : ''}
      </p>

      <div className="divide-y divide-white/5">
        {visible.map(m => (
          <button
            key={m._key}
            onClick={() => navigate(`/bestiary/${encodeURIComponent(m._key)}`)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors min-h-[3rem]"
          >
            <span className="font-medium text-sm">{m.name}</span>
            <span className="text-xs text-slate-400 ml-2 shrink-0">
              {m.cr != null ? `CR ${crStr(m.cr)} · ` : ''}{monsterTypeStr(m.type)}
            </span>
          </button>
        ))}
      </div>

      {hasMore && <div ref={bottomRef} className="h-8" />}

      {!hasMore && filtered.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-12">No monsters found</p>
      )}
    </div>
  );
}
