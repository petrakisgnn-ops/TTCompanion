import { db } from '../db';
import type { Character } from '../../domain/character/types';
import type { CharacterRepository } from './CharacterRepository';

// Fill in fields added after a character was created so old saves don't crash.
function normalize(c: Character): Character {
  return {
    ...c,
    hitDiceSpent: c.hitDiceSpent ?? 0,
    deathSaves: c.deathSaves ?? { successes: 0, failures: 0 },
    concentration: c.concentration ?? null,
    conditions: c.conditions ?? [],
    currency: c.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    knownSpells: c.knownSpells ?? [],
    preparedSpells: c.preparedSpells ?? [],
    feats: c.feats ?? [],
    alignment: c.alignment ?? null,
    personality: c.personality ?? { trait: '', ideal: '', bond: '', flaw: '' },
    appearance: c.appearance ?? { age: '', height: '', weight: '', eyes: '', skin: '', hair: '' },
  };
}

export const dexieCharacterRepository: CharacterRepository = {
  list: async () => (await db.characters.toArray()).map(normalize),

  get: async (id) => { const c = await db.characters.get(id); return c ? normalize(c) : undefined; },

  save: (c) => db.characters.put(c).then(() => undefined),

  remove: (id) => db.characters.delete(id),

  export: async (id) => {
    const c = await db.characters.get(id);
    if (!c) throw new Error(`Character ${id} not found`);
    return JSON.stringify(c);
  },

  import: async (blob) => {
    const c: Character = JSON.parse(blob) as Character;
    await db.characters.put(c);
    return c;
  },
};
