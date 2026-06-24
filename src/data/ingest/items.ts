import { db } from '../db';
import { refKey } from '../../domain/reference/types';
import type { Item } from '../../domain/reference/types';

export async function ingestItems(
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  onProgress(0, 2);

  const [itemsRes, baseRes] = await Promise.all([
    fetch('/data/items.json'),
    fetch('/data/items-base.json'),
  ]);

  const [itemsData, baseData]: [
    { item?: Item[] },
    { baseitem?: Item[] },
  ] = await Promise.all([itemsRes.json(), baseRes.json()]);

  const allItems = [
    ...(itemsData.item ?? []),
    ...(baseData.baseitem ?? []),
  ];

  const records = allItems.map(item => ({
    ...item,
    _key: refKey({ name: item.name, source: item.source }),
  }));

  await db.items.bulkPut(records);
  onProgress(2, 2);
}
