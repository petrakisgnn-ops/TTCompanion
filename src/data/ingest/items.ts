import { db } from '../db';
import { refKey } from '../../domain/reference/types';
import type { Item } from '../../domain/reference/types';
import { expandMagicVariants, type MagicVariant } from '../../domain/reference/magicVariants';

export async function ingestItems(
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  onProgress(0, 3);

  const [itemsData, baseData, variantData]: [
    { item?: Item[] },
    { baseitem?: Item[] },
    { magicvariant?: MagicVariant[] },
  ] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/items.json`).then(r => r.json() as Promise<{ item?: Item[] }>),
    fetch(`${import.meta.env.BASE_URL}data/items-base.json`).then(r => r.json() as Promise<{ baseitem?: Item[] }>),
    fetch(`${import.meta.env.BASE_URL}data/magicvariants.json`).then(r => r.json() as Promise<{ magicvariant?: MagicVariant[] }>).catch(() => ({})),
  ]);
  onProgress(2, 3);

  const baseItems = baseData.baseitem ?? [];
  const realItems = [...(itemsData.item ?? []), ...baseItems];
  const existing = new Set(realItems.map(i => refKey(i)));
  // Specific items from generic variants ("Weapon of Warning" → "Mace of Warning", "+1 Longsword", …).
  const generated = expandMagicVariants(baseItems, variantData.magicvariant ?? [], existing);

  const records = [...realItems, ...generated].map(item => ({
    ...item,
    _key: refKey({ name: item.name, source: item.source }),
  }));

  await db.items.clear();
  await db.items.bulkPut(records);
  onProgress(3, 3);
}
