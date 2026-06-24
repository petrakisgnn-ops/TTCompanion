import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import type { StoredItem } from '../../data/db';
import { CompendiumTabs } from './CompendiumTabs';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesEdition } from '../../domain/rules/edition';

const PAGE_SIZE = 80;

// Display labels for item type codes
const TYPE_LABEL: Record<string, string> = {
  M: 'Melee', R: 'Ranged', A: 'Ammo', LA: 'Lt Armor', MA: 'Md Armor',
  HA: 'Hv Armor', S: 'Shield', P: 'Potion', SC: 'Scroll', WD: 'Wand',
  RG: 'Ring', ST: 'Staff', RD: 'Rod', G: 'Gear', GS: 'Game Set',
  INS: 'Instrument', MNT: 'Mount', FD: 'Food', SCF: 'Focus',
  AT: 'Tool', T: 'Tool', OTH: 'Other',
};

const RARITY_COLOR: Record<string, string> = {
  none: 'text-slate-500',
  common: 'text-slate-400',
  uncommon: 'text-emerald-400',
  rare: 'text-sky-400',
  'very rare': 'text-purple-400',
  legendary: 'text-amber-400',
  artifact: 'text-red-400',
};

type Category = 'all' | 'weapons' | 'armor' | 'magic' | 'gear';

const WEAPON_TYPES = new Set(['M', 'R', 'A']);
const ARMOR_TYPES = new Set(['LA', 'MA', 'HA', 'S']);
const MAGIC_RARITIES = new Set(['uncommon', 'rare', 'very rare', 'legendary', 'artifact']);

function itemCategory(item: StoredItem): Category {
  const t = (item.type as string | undefined)?.split('|')[0] ?? '';
  if (WEAPON_TYPES.has(t)) return 'weapons';
  if (ARMOR_TYPES.has(t)) return 'armor';
  if (MAGIC_RARITIES.has(item.rarity ?? '')) return 'magic';
  return 'gear';
}

function typeLabel(item: StoredItem): string {
  const raw = (item.type as string | undefined)?.split('|')[0] ?? '';
  return (TYPE_LABEL[raw] ?? raw) || 'Item';
}

function rarityLabel(rarity: string | undefined): string {
  if (!rarity || rarity === 'none') return '';
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'weapons', label: 'Weapons' },
  { key: 'armor',   label: 'Armor'   },
  { key: 'magic',   label: 'Magic'   },
  { key: 'gear',    label: 'Gear'    },
];

export function ItemListPage() {
  const navigate = useNavigate();
  const { edition } = useSettingsStore();
  const [allItems, setAllItems] = useState<StoredItem[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [page, setPage] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.items.orderBy('name').toArray().then(setAllItems);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allItems.filter(item => {
      if (!matchesEdition(item.source ?? '', (item as unknown as Record<string,unknown>).reprintedAs, edition)) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (category !== 'all' && itemCategory(item) !== category) return false;
      return true;
    });
  }, [allItems, query, category, edition]);

  useEffect(() => { setPage(1); }, [query, category]);

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
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10">
        <CompendiumTabs />
        <div className="px-4 pt-3 pb-2 space-y-2">
          <input
            type="search"
            placeholder="Search items…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  category === c.key
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="px-4 py-1.5 text-xs text-slate-500">
        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
      </p>

      <div className="divide-y divide-white/5">
        {visible.map(item => {
          const rarity = rarityLabel(item.rarity);
          const rarityColor = RARITY_COLOR[item.rarity ?? ''] ?? 'text-slate-500';
          return (
            <button
              key={item._key}
              onClick={() => navigate(`/items/${encodeURIComponent(item._key)}`)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 min-h-[3rem]"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                {rarity && (
                  <p className={`text-xs ${rarityColor}`}>{rarity}</p>
                )}
              </div>
              <span className="text-xs text-slate-500 ml-3 shrink-0">{typeLabel(item)}</span>
            </button>
          );
        })}
      </div>

      {hasMore && <div ref={bottomRef} className="h-8" />}
      {!hasMore && filtered.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-12">No items found</p>
      )}
    </div>
  );
}
