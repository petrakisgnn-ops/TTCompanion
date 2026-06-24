import { db } from '../db';
import { ingestSpells } from './spells';
import { ingestMonsters } from './monsters';
import { ingestItems } from './items';

export const INGEST_VERSION = 1;

export interface IngestProgress {
  label: string;
  loaded: number;
  total: number;
}

export async function needsIngest(): Promise<boolean> {
  const meta = await db.meta.get('ingestVersion');
  return meta?.value !== INGEST_VERSION;
}

export async function runIngest(
  onProgress: (p: IngestProgress) => void,
): Promise<void> {
  onProgress({ label: 'Loading spells…', loaded: 0, total: 1 });
  await ingestSpells((loaded, total) =>
    onProgress({ label: 'Loading spells…', loaded, total }),
  );

  onProgress({ label: 'Loading bestiary…', loaded: 0, total: 1 });
  await ingestMonsters((loaded, total) =>
    onProgress({ label: 'Loading bestiary…', loaded, total }),
  );

  onProgress({ label: 'Loading items…', loaded: 0, total: 1 });
  await ingestItems((loaded, total) =>
    onProgress({ label: 'Loading items…', loaded, total }),
  );

  await db.meta.put({ key: 'ingestVersion', value: INGEST_VERSION });
}
