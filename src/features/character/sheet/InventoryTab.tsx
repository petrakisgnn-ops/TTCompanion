import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../data/db';
import type { StoredItem } from '../../../data/db';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';

const RARITY_COLOR: Record<string, string> = {
  none:      'text-[var(--color-faint)]',
  common:    'text-[var(--color-muted)]',
  uncommon:  'text-emerald-400',
  rare:      'text-sky-400',
  'very rare': 'text-purple-400',
  legendary: 'text-amber-400',
  artifact:  'text-red-400',
};

interface InventoryTabProps { character: Character }

export function InventoryTab({ character }: InventoryTabProps) {
  const navigate = useNavigate();
  const { addInventoryItem, removeInventoryItem, setInventoryQuantity, toggleEquipped } = useCharacterStore();
  const [resolved, setResolved] = useState<Map<string, StoredItem>>(new Map());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemKey = (ref: { name: string; source: string }) =>
    `${ref.name}|${ref.source}`.toLowerCase();

  // Resolve inventory item refs → full item data
  useEffect(() => {
    if (character.inventory.length === 0) { setResolved(new Map()); return; }
    const keys = character.inventory.map(i => itemKey(i.itemRef));
    db.items.bulkGet(keys).then(items => {
      const map = new Map<string, StoredItem>();
      items.forEach(item => { if (item) map.set(item._key, item); });
      setResolved(map);
    });
  }, [character.inventory]);

  // Debounced item search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const q = query.toLowerCase();
      const all = await db.items.orderBy('name').toArray();
      setResults(all.filter(i => i.name.toLowerCase().includes(q)).slice(0, 10));
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const equipped = character.inventory.filter(i => i.equipped);
  const carried  = character.inventory.filter(i => !i.equipped);

  const renderItem = (inv: (typeof character.inventory)[number]) => {
    const key = itemKey(inv.itemRef);
    const item = resolved.get(key);
    const rarity = (item?.rarity ?? 'none').toLowerCase();

    return (
      <div key={key} className="flex items-center gap-2 py-2.5 px-4 border-b border-[var(--color-border)] last:border-0">
        {/* Equipped toggle */}
        <button
          onClick={() => toggleEquipped(character.id, key)}
          className={`w-5 h-5 rounded border-2 shrink-0 transition-colors ${
            inv.equipped ? 'bg-amber-500 border-amber-500' : 'border-slate-600 hover:border-amber-500'
          }`}
          aria-label={inv.equipped ? 'Unequip' : 'Equip'}
          title={inv.equipped ? 'Equipped — tap to unequip' : 'Tap to equip'}
        />

        {/* Name */}
        <button
          onClick={() => navigate(`/items/${encodeURIComponent(key)}`)}
          className="flex-1 text-left min-w-0"
        >
          <span className="text-sm font-medium truncate block">{inv.itemRef.name}</span>
          {item && rarity !== 'none' && (
            <span className={`text-xs ${RARITY_COLOR[rarity] ?? 'text-[var(--color-faint)]'}`}>
              {item.rarity}
            </span>
          )}
        </button>

        {/* Quantity */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setInventoryQuantity(character.id, key, inv.quantity - 1)}
            className="w-6 h-6 rounded bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)] text-sm font-bold leading-none"
          >
            −
          </button>
          <span className="text-sm w-6 text-center">{inv.quantity}</span>
          <button
            onClick={() => setInventoryQuantity(character.id, key, inv.quantity + 1)}
            className="w-6 h-6 rounded bg-[var(--color-raised)] text-[var(--color-text-2)] hover:bg-[var(--color-card-inner)] text-sm font-bold leading-none"
          >
            +
          </button>
        </div>

        {/* Remove */}
        <button
          onClick={() => removeInventoryItem(character.id, key)}
          className="text-[var(--color-disabled)] hover:text-red-400 transition-colors text-sm shrink-0 pl-1"
          aria-label="Remove item"
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-faint)]">
          {character.inventory.length} item{character.inventory.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => { setShowSearch(v => !v); setQuery(''); setResults([]); }}
          className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
        >
          {showSearch ? 'Done' : '+ Add Item'}
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <div>
          <input
            type="search"
            autoFocus
            placeholder="Search items…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[var(--color-card)] rounded-xl px-4 py-2.5 text-sm outline-none outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
          />
          {results.length > 0 && (
            <div className="mt-1 bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {results.map(item => (
                <button
                  key={item._key}
                  onClick={() => {
                    addInventoryItem(character.id, { name: item.name, source: item.source });
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5"
                >
                  <span className="text-sm">{item.name}</span>
                  <span className={`text-xs ml-2 shrink-0 ${RARITY_COLOR[(item.rarity ?? 'none').toLowerCase()] ?? 'text-[var(--color-faint)]'}`}>
                    {item.rarity && item.rarity !== 'none' ? item.rarity : item.type ?? ''}
                  </span>
                </button>
              ))}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <p className="text-xs text-[var(--color-disabled)] mt-2 text-center">No items found</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {character.inventory.length === 0 && !showSearch && (
        <div className="text-center py-12 text-[var(--color-faint)] text-sm">No items yet.</div>
      )}

      {/* Equipped section */}
      {equipped.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1">
            Equipped <span className="font-normal text-[var(--color-disabled)]">({equipped.length})</span>
          </h3>
          <div className="bg-[var(--color-card)] rounded-xl overflow-hidden">
            {equipped.map(renderItem)}
          </div>
        </div>
      )}

      {/* Carried section */}
      {carried.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1">
            Carried <span className="font-normal text-[var(--color-disabled)]">({carried.length})</span>
          </h3>
          <div className="bg-[var(--color-card)] rounded-xl overflow-hidden">
            {carried.map(renderItem)}
          </div>
        </div>
      )}
    </div>
  );
}
