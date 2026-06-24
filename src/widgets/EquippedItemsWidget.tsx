import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../data/db';
import type { StoredItem } from '../data/db';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

const RARITY_COLOR: Record<string, string> = {
  uncommon:   'text-emerald-400',
  rare:       'text-sky-400',
  'very rare':'text-purple-400',
  legendary:  'text-amber-400',
  artifact:   'text-red-400',
};

function EquippedItemsWidget({ character }: WidgetProps) {
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<Map<string, StoredItem>>(new Map());
  const equipped = character.inventory.filter(i => i.equipped);

  useEffect(() => {
    if (equipped.length === 0) { setResolved(new Map()); return; }
    const keys = character.inventory
      .filter(i => i.equipped)
      .map(i => `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase());
    db.items.bulkGet(keys).then(items => {
      const map = new Map<string, StoredItem>();
      items.forEach(item => { if (item) map.set(item._key, item); });
      setResolved(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.inventory]);

  if (equipped.length === 0) {
    return (
      <div className="p-3 flex items-center justify-center min-h-[3rem]">
        <p className="text-xs text-slate-600 italic">Nothing equipped.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {equipped.map(inv => {
        const key = `${inv.itemRef.name}|${inv.itemRef.source}`.toLowerCase();
        const item = resolved.get(key);
        const rarity = (item?.rarity ?? '').toLowerCase();
        return (
          <button
            key={key}
            onClick={() => navigate(`/items/${encodeURIComponent(key)}`)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <span className="text-sm font-medium truncate">{inv.itemRef.name}</span>
            {rarity && rarity !== 'none' && RARITY_COLOR[rarity] && (
              <span className={`text-xs ml-2 shrink-0 ${RARITY_COLOR[rarity]}`}>
                {item?.rarity}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

registerWidget({
  typeId: 'equipped-items',
  label: 'Equipped Items',
  icon: 'checkroom',
  defaultConfig: {},
  defaultSpan: 2,
  component: EquippedItemsWidget,
});
