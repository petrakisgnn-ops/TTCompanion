import { db } from '../db';
import { refKey } from '../../domain/reference/types';
import type { Spell } from '../../domain/reference/types';

export async function ingestSpells(
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  const indexRes = await fetch('/data/spells/index.json');
  const index: Record<string, string> = await indexRes.json();
  const files = Object.values(index);
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    try {
      const res = await fetch(`/data/spells/${file}`);
      const data: { spell?: Spell[] } = await res.json();
      const spells = data.spell ?? [];
      const records = spells.map(s => ({
        ...s,
        _key: refKey({ name: s.name, source: s.source }),
      }));
      await db.spells.bulkPut(records);
    } catch {
      // skip files that fail — don't abort the whole ingest
    }
    onProgress(i + 1, total);
  }
}
