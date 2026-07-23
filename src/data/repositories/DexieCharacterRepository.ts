import { db } from '../db';
import type { Character } from '../../domain/character/types';
import type { CharacterRepository } from './CharacterRepository';
import { recomputeAllResources } from '../../domain/rules/resources';

// Fill in fields added after a character was created so old saves don't crash.
function normalize(c: Character): Character {
  const withDefaults: Character = {
    ...c,
    // Characters created before edition support are 2014 (5e).
    edition: c.edition ?? '5e',
    proficiencies: { ...c.proficiencies, expertise: c.proficiencies?.expertise ?? [] },
    hitDiceSpent: c.hitDiceSpent ?? 0,
    deathSaves: c.deathSaves ?? { successes: 0, failures: 0 },
    concentration: c.concentration ?? null,
    conditions: c.conditions ?? [],
    currency: c.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    knownSpells: c.knownSpells ?? [],
    preparedSpells: c.preparedSpells ?? [],
    optionalFeatures: c.optionalFeatures ?? [],
    masteredWeapons: c.masteredWeapons ?? [],
    feats: c.feats ?? [],
    resources: c.resources ?? [],
    alignment: c.alignment ?? null,
    personality: c.personality ?? { trait: '', ideal: '', bond: '', flaw: '' },
    appearance: c.appearance ?? { age: '', height: '', weight: '', eyes: '', skin: '', hair: '' },
  };

  // Backfill class-derived resources added in a newer version (e.g. Arcane Recovery, or
  // slots for a caster subclass) onto characters created before those existed. The merge
  // preserves spent amounts and leaves non-class resources (innate spell trackers, etc.)
  // untouched — see recomputeAllResources.
  return {
    ...withDefaults,
    resources: recomputeAllResources(withDefaults.classes, withDefaults.resources, withDefaults.abilityScores, withDefaults.edition),
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
    const c = normalize(JSON.parse(blob) as Character);
    await db.characters.put(c);
    return c;
  },
};
