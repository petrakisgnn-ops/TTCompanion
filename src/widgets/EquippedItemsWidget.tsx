import { useNavigate } from 'react-router-dom';
import { useResolvedItems } from '../features/character/useResolvedItems';
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
  const equipped = character.inventory.filter(i => i.equipped);
  const resolved = useResolvedItems(equipped.map(i => i.itemRef), character.customItems);

  if (equipped.length === 0) {
    return (
      <div className="p-3 flex items-center justify-center min-h-[3rem]">
        <p className="text-xs text-[var(--color-faint)] italic">Nothing equipped.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {equipped.map(inv => {
        const key = `${inv.itemRef.name}|${inv.itemRef.source}`.toLowerCase();
        const item = resolved.get(key);
        const rarity = (item?.rarity ?? '').toLowerCase();
        return (
          <button
            key={key}
            onClick={() => navigate(`/items/${encodeURIComponent(key)}`)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 active:bg-[var(--color-raised)] transition-colors"
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
