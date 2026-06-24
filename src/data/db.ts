import Dexie, { type Table } from 'dexie';
import type { Spell, Monster, Item } from '../domain/reference/types';
import type { Character } from '../domain/character/types';

// Stored records add a _key = "name|source" (lowercase) primary key
export type StoredSpell = Spell & { _key: string };
export type StoredMonster = Monster & { _key: string };
export type StoredItem = Item & { _key: string };

export class DndDb extends Dexie {
  spells!: Table<StoredSpell>;
  monsters!: Table<StoredMonster>;
  items!: Table<StoredItem>;
  characters!: Table<Character>;
  meta!: Table<{ key: string; value: unknown }>;

  constructor() {
    super('dnd-companion');
    this.version(1).stores({
      spells:     '_key, name, source, level, school',
      // type and cr are complex — queried/filtered client-side after fetch
      monsters:   '_key, name, source',
      items:      '_key, name, source, rarity',
      characters: 'id, name',
      meta:       'key',
    });
  }
}

export const db = new DndDb();
