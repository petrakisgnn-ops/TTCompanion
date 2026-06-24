import { db } from '../db';
import { refKey } from '../../domain/reference/types';
import type { RefId } from '../../domain/reference/types';
import type { ReferenceRepository } from './ReferenceRepository';

export const dexieReferenceRepository: ReferenceRepository = {
  async get(kind, ref: RefId) {
    const key = refKey(ref);
    switch (kind) {
      case 'spells':   return db.spells.get(key);
      case 'monsters': return db.monsters.get(key);
      case 'items':    return db.items.get(key);
      default:         return undefined;
    }
  },

  async search(kind, query, filters) {
    const q = query.trim().toLowerCase();
    switch (kind) {
      case 'spells': {
        let col = q
          ? db.spells.where('name').startsWithIgnoreCase(q)
          : db.spells.toCollection();
        if (filters?.level !== undefined)
          col = col.and(s => s.level === (filters.level as number));
        if (filters?.school)
          col = col.and(s => s.school === (filters.school as string));
        return col.sortBy('name');
      }
      case 'monsters': {
        const col = q
          ? db.monsters.where('name').startsWithIgnoreCase(q)
          : db.monsters.toCollection();
        return col.sortBy('name');
      }
      case 'items': {
        const col = q
          ? db.items.where('name').startsWithIgnoreCase(q)
          : db.items.toCollection();
        return col.sortBy('name');
      }
      default:
        return [];
    }
  },
};
