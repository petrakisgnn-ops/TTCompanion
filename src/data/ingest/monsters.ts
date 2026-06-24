import { db } from '../db';
import { refKey } from '../../domain/reference/types';
import type { Monster } from '../../domain/reference/types';

export async function ingestMonsters(
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  const indexRes = await fetch('/data/bestiary/index.json');
  const index: Record<string, string> = await indexRes.json();
  // Skip fluff files — only load stat-block files
  const files = Object.values(index).filter(f => !f.startsWith('fluff-'));
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    try {
      const res = await fetch(`/data/bestiary/${file}`);
      const data: { monster?: Monster[] } = await res.json();
      const monsters = data.monster ?? [];
      const records = monsters.map(m => ({
        ...m,
        _key: refKey({ name: m.name, source: m.source }),
      }));
      await db.monsters.bulkPut(records);
    } catch {
      // skip files that fail
    }
    onProgress(i + 1, total);
  }
}
