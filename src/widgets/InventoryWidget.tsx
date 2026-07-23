import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../data/db';
import type { StoredItem } from '../data/db';
import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import type { InventoryItem } from '../domain/character/types';

const RARITY_COLOR: Record<string, string> = {
  uncommon:    'text-emerald-400',
  rare:        'text-sky-400',
  'very rare': 'text-purple-400',
  legendary:   'text-amber-400',
  artifact:    'text-red-400',
};

function InventoryWidget({ character }: WidgetProps) {
  const navigate = useNavigate();
  const { toggleEquipped } = useCharacterStore();
  const [resolved, setResolved] = useState<Map<string, StoredItem>>(new Map());

  useEffect(() => {
    if (character.inventory.length === 0) { setResolved(new Map()); return; }
    const keys = character.inventory.map(
      i => `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase(),
    );
    db.items.bulkGet(keys).then(items => {
      const map = new Map<string, StoredItem>();
      items.forEach(item => { if (item) map.set(item._key, item); });
      setResolved(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.inventory]);

  if (character.inventory.length === 0) {
    return (
      <div className="p-3 flex items-center justify-center min-h-[3rem]">
        <p className="text-xs text-[var(--color-faint)] italic">No items.</p>
      </div>
    );
  }

  const equipped = character.inventory.filter(i => i.equipped);
  const carried  = character.inventory.filter(i => !i.equipped);

  const renderRow = (inv: InventoryItem) => {
    const key = `${inv.itemRef.name}|${inv.itemRef.source}`.toLowerCase();
    const item = resolved.get(key);
    const rarity = (item?.rarity ?? '').toLowerCase();

    return (
      <div
        key={key}
        className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)] last:border-0"
      >
        <button
          onClick={() => toggleEquipped(character.id, key)}
          className={`w-4 h-4 rounded border-2 shrink-0 transition-colors ${
            inv.equipped
              ? 'bg-amber-500 border-amber-500'
              : 'border-[var(--color-border)] hover:border-amber-500'
          }`}
          aria-label={inv.equipped ? 'Unequip' : 'Equip'}
        />
        <button
          onClick={() => navigate(`/items/${encodeURIComponent(key)}`)}
          className="flex-1 text-left text-sm font-medium min-w-0 truncate"
        >
          {inv.itemRef.name}
        </button>
        {rarity && rarity !== 'none' && RARITY_COLOR[rarity] && (
          <span className={`text-xs shrink-0 ${RARITY_COLOR[rarity]}`}>
            {item?.rarity}
          </span>
        )}
        {inv.quantity > 1 && (
          <span className="text-xs text-[var(--color-muted)] shrink-0">×{inv.quantity}</span>
        )}
      </div>
    );
  };

  return (
    <div>
      {equipped.length > 0 && (
        <>
          <div className="px-3 pt-2.5 pb-0.5">
            <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Equipped</span>
          </div>
          {equipped.map(renderRow)}
        </>
      )}
      {carried.length > 0 && (
        <>
          <div className="px-3 pt-2.5 pb-0.5">
            <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Carried</span>
          </div>
          {carried.map(renderRow)}
        </>
      )}
    </div>
  );
}

registerWidget({
  typeId: 'inventory',
  label: 'Inventory',
  icon: 'backpack',
  defaultConfig: {},
  defaultSpan: 2,
  component: InventoryWidget,
});
