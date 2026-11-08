import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../data/db';
import type { StoredItem } from '../../../data/db';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';
import { customItemRef, customItemSummary, isCustomRef, type CustomItem } from '../../../domain/character/customItems';
import { useResolvedItems } from '../useResolvedItems';
import { searchItems } from '../../../domain/reference/itemSearch';
import { CustomItemSheet } from './CustomItemSheet';

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
  const resolved = useResolvedItems(character.inventory.map(i => i.itemRef), character.customItems);
  // Custom item editor: null = closed, 'new' = create, otherwise the item being edited.
  const [editing, setEditing] = useState<CustomItem | 'new' | null>(null);
  const customItems = character.customItems ?? [];
  const findCustom = (name: string) => customItems.find(c => c.name.toLowerCase() === name.toLowerCase());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemKey = (ref: { name: string; source: string }) =>
    `${ref.name}|${ref.source}`.toLowerCase();

  // Debounced item search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const q = query.toLowerCase();
      const all = await db.items.orderBy('name').toArray();
      // Ranked (exact name first) and limited to the character's edition — see searchItems.
      setResults(searchItems(all, q, { edition: character.edition, limit: 25 }));
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, character.edition]);

  const q = query.trim().toLowerCase();
  const matchingCustom = q ? customItems.filter(c => c.name.toLowerCase().includes(q)) : [];

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

        {/* Name — custom items open their editor, reference items their detail page */}
        <button
          onClick={() => {
            const custom = isCustomRef(inv.itemRef) ? findCustom(inv.itemRef.name) : undefined;
            if (custom) setEditing(custom);
            else navigate(`/items/${encodeURIComponent(key)}`);
          }}
          className="flex-1 text-left min-w-0 min-h-[44px] flex flex-col justify-center"
        >
          <span className="text-sm font-medium truncate block">{inv.itemRef.name}</span>
          <span className="text-xs flex gap-1.5 items-center min-w-0">
            {item && rarity !== 'none' && (
              <span className={RARITY_COLOR[rarity] ?? 'text-[var(--color-faint)]'}>{String(item.rarity)}</span>
            )}
            {isCustomRef(inv.itemRef) && (
              <span className="text-[var(--color-faint)] truncate">
                Custom{findCustom(inv.itemRef.name) && customItemSummary(findCustom(inv.itemRef.name)!) ? ` · ${customItemSummary(findCustom(inv.itemRef.name)!)}` : ''}
              </span>
            )}
          </span>
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditing('new')}
            className="text-xs text-amber-500 hover:text-amber-400 font-semibold min-h-[44px]"
          >
            + Create Item
          </button>
          <button
            onClick={() => { setShowSearch(v => !v); setQuery(''); setResults([]); }}
            className="text-xs text-amber-500 hover:text-amber-400 font-semibold min-h-[44px]"
          >
            {showSearch ? 'Done' : '+ Add Item'}
          </button>
        </div>
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
            <div className="mt-1 bg-[var(--color-card)] rounded-xl overflow-y-auto max-h-80 divide-y divide-[var(--color-border)]">
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
          {matchingCustom.length > 0 && (
            <div className="mt-1 bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {matchingCustom.map(c => (
                <button
                  key={c.id}
                  onClick={() => { addInventoryItem(character.id, customItemRef(c)); setQuery(''); setResults([]); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5"
                >
                  <span className="text-sm">{c.name}</span>
                  <span className="text-xs ml-2 shrink-0 text-[var(--color-faint)]">Custom</span>
                </button>
              ))}
            </div>
          )}
          {query.trim() && results.length === 0 && matchingCustom.length === 0 && (
            <div className="mt-2 text-center space-y-1">
              <p className="text-xs text-[var(--color-disabled)]">No items found</p>
              <button onClick={() => setEditing('new')} className="text-xs text-amber-500 font-semibold min-h-[44px]">
                Create “{query.trim()}” as a custom item
              </button>
            </div>
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
      {editing && (
        <CustomItemSheet
          character={character}
          item={editing === 'new' ? undefined : editing}
          initialName={editing === 'new' ? query.trim() : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
