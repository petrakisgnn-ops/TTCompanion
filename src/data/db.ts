import Dexie, { type Table } from 'dexie';
import type { Spell, Monster, Item } from '../domain/reference/types';
import type { Character } from '../domain/character/types';
import type { NpcDefinition, EncounterGroup, SessionNote } from '../domain/dm/types';

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
  npcs!: Table<NpcDefinition>;
  encounterGroups!: Table<EncounterGroup>;
  sessionNotes!: Table<SessionNote>;

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
    this.version(2).stores({
      npcs:            'id, groupId',
      encounterGroups: 'id',
      sessionNotes:    'id, createdAt',
    });
  }
}

export const db = new DndDb();
