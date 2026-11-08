import { useEffect, useState } from 'react';
import { db } from '../../data/db';
import { refKey, type Item, type RefId } from '../../domain/reference/types';
import { customItemToItem, isCustomRef, type CustomItem } from '../../domain/character/customItems';

/**
 * Resolves item refs to full item records: reference items from the item DB, player-made
 * items from the character's `customItems` (merged over their base item). Keyed by refKey.
 */
export async function resolveItems(refs: RefId[], customItems: CustomItem[] = []): Promise<Map<string, Item>> {
  const map = new Map<string, Item>();
  const refItems = refs.filter(r => !isCustomRef(r));
  const customs = refs
    .filter(isCustomRef)
    .map(r => customItems.find(c => c.name.toLowerCase() === r.name.toLowerCase()))
    .filter((c): c is CustomItem => !!c);

  const baseKeys = customs.flatMap(c => (c.baseItem ? [refKey(c.baseItem)] : []));
  const keys = [...refItems.map(refKey), ...baseKeys];
  const found = keys.length ? await db.items.bulkGet(keys) : [];
  const byKey = new Map<string, Item>();
  found.forEach((item, i) => { if (item) byKey.set(keys[i], item); });

  for (const r of refItems) {
    const item = byKey.get(refKey(r));
    if (item) map.set(refKey(r), item);
  }
  for (const c of customs) {
    const base = c.baseItem ? byKey.get(refKey(c.baseItem)) : undefined;
    const item = customItemToItem(c, base);
    map.set(refKey(item), item);
  }
  return map;
}

/** Hook form of resolveItems; re-resolves when the refs or custom items change. */
export function useResolvedItems(refs: RefId[], customItems: CustomItem[] | undefined): Map<string, Item> {
  const [resolved, setResolved] = useState<Map<string, Item>>(new Map());
  const depKey = refs.map(refKey).join('\n');

  useEffect(() => {
    let cancelled = false;
    void resolveItems(refs, customItems).then(m => { if (!cancelled) setResolved(m); });
    return () => { cancelled = true; };
    // depKey stands in for `refs` (a fresh array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, customItems]);

  return resolved;
}
