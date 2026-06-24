import { create } from 'zustand';
import { dexieCharacterRepository } from '../data/repositories/DexieCharacterRepository';
import type { Character, Currency, ResourceTrack, AbilityScores } from '../domain/character/types';
import type { RefId } from '../domain/reference/types';
import { getClassData } from '../domain/rules/classData';
import { computeSpellSlots } from '../domain/rules/spellSlots';
import { abilityMod } from '../domain/rules';

interface CharacterStore {
  characters: Character[];
  activeId: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  setActive: (id: string | null) => void;
  create: (c: Character) => Promise<void>;
  remove: (id: string) => Promise<void>;

  /** Apply a pure mutation to a character and persist it. */
  mutate: (id: string, fn: (c: Character) => Character) => Promise<void>;

  updateHp: (id: string, delta: number) => Promise<void>;
  setTempHp: (id: string, temp: number) => Promise<void>;
  spendResource: (id: string, resourceId: string) => Promise<void>;
  restoreResource: (id: string, resourceId: string) => Promise<void>;
  shortRest: (id: string) => Promise<void>;
  longRest: (id: string) => Promise<void>;
  levelUp: (id: string, opts: {
    classIndex: number;
    hpGain: number;
    abilityBoosts?: Partial<AbilityScores>;
    subclass?: RefId;
  }) => Promise<void>;
  addCondition: (id: string, condition: string) => Promise<void>;
  removeCondition: (id: string, condition: string) => Promise<void>;
  addInventoryItem: (id: string, item: RefId) => Promise<void>;
  removeInventoryItem: (id: string, itemKey: string) => Promise<void>;
  setInventoryQuantity: (id: string, itemKey: string, qty: number) => Promise<void>;
  toggleEquipped: (id: string, itemKey: string) => Promise<void>;
  setCurrency: (id: string, currency: Partial<Currency>) => Promise<void>;
  spendHitDie: (id: string, hpGained: number) => Promise<void>;
  rollDeathSave: (id: string, success: boolean) => Promise<void>;
  resetDeathSaves: (id: string) => Promise<void>;
  setConcentration: (id: string, spell: RefId | null) => Promise<void>;
  exportAll: () => string;
  importAll: (json: string) => Promise<void>;
  addPreparedSpell: (id: string, spell: RefId) => Promise<void>;
  removePreparedSpell: (id: string, spell: RefId) => Promise<void>;
  addKnownSpell: (id: string, spell: RefId) => Promise<void>;
  removeKnownSpell: (id: string, spell: RefId) => Promise<void>;
  addFeat: (id: string, feat: RefId) => Promise<void>;
  removeFeat: (id: string, feat: RefId) => Promise<void>;
}

export const useCharacterStore = create<CharacterStore>()((set, get) => ({
  characters: [],
  activeId: null,
  loaded: false,

  load: async () => {
    const characters = await dexieCharacterRepository.list();
    set({ characters, loaded: true });
  },

  setActive: (id) => set({ activeId: id }),

  create: async (c) => {
    await dexieCharacterRepository.save(c);
    set(s => ({ characters: [...s.characters, c] }));
  },

  remove: async (id) => {
    await dexieCharacterRepository.remove(id);
    set(s => ({
      characters: s.characters.filter(c => c.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    }));
  },

  mutate: async (id, fn) => {
    const { characters } = get();
    const idx = characters.findIndex(c => c.id === id);
    if (idx === -1) return;
    const updated = fn(characters[idx]);
    await dexieCharacterRepository.save(updated);
    const next = [...characters];
    next[idx] = updated;
    set({ characters: next });
  },

  updateHp: (id, delta) =>
    get().mutate(id, c => ({
      ...c,
      hp: {
        ...c.hp,
        current: Math.max(0, Math.min(c.hp.max + c.hp.temp, c.hp.current + delta)),
      },
    })),

  setTempHp: (id, temp) =>
    get().mutate(id, c => ({ ...c, hp: { ...c.hp, temp: Math.max(0, temp) } })),

  spendResource: (id, resourceId) =>
    get().mutate(id, c => ({
      ...c,
      resources: c.resources.map((r): ResourceTrack =>
        r.id === resourceId ? { ...r, current: Math.max(0, r.current - 1) } : r,
      ),
    })),

  restoreResource: (id, resourceId) =>
    get().mutate(id, c => ({
      ...c,
      resources: c.resources.map((r): ResourceTrack =>
        r.id === resourceId ? { ...r, current: Math.min(r.max, r.current + 1) } : r,
      ),
    })),

  shortRest: (id) =>
    get().mutate(id, c => ({
      ...c,
      resources: c.resources.map((r): ResourceTrack =>
        r.resetOn === 'shortRest' ? { ...r, current: r.max } : r,
      ),
    })),

  longRest: (id) =>
    get().mutate(id, c => {
      const totalLvl = c.classes.reduce((s, cl) => s + cl.level, 0);
      // Recover floor(level/2) hit dice on long rest, min 1
      const recover = Math.max(1, Math.floor(totalLvl / 2));
      return {
        ...c,
        hp: { ...c.hp, current: c.hp.max, temp: 0 },
        hitDiceSpent: Math.max(0, (c.hitDiceSpent ?? 0) - recover),
        deathSaves: { successes: 0, failures: 0 },
        concentration: null,
        resources: c.resources.map((r): ResourceTrack =>
          r.resetOn === 'longRest' || r.resetOn === 'shortRest'
            ? { ...r, current: r.max }
            : r,
        ),
      };
    }),

  addInventoryItem: (id, item) =>
    get().mutate(id, c => {
      const key = `${item.name}|${item.source}`.toLowerCase();
      const existing = c.inventory.find(i => `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase() === key);
      if (existing) {
        return {
          ...c,
          inventory: c.inventory.map(i =>
            `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase() === key
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          ),
        };
      }
      return { ...c, inventory: [...c.inventory, { itemRef: item, quantity: 1, equipped: false }] };
    }),

  removeInventoryItem: (id, itemKey) =>
    get().mutate(id, c => ({
      ...c,
      inventory: c.inventory.filter(
        i => `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase() !== itemKey,
      ),
    })),

  setInventoryQuantity: (id, itemKey, qty) =>
    get().mutate(id, c => ({
      ...c,
      inventory: qty <= 0
        ? c.inventory.filter(i => `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase() !== itemKey)
        : c.inventory.map(i =>
            `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase() === itemKey
              ? { ...i, quantity: qty }
              : i,
          ),
    })),

  toggleEquipped: (id, itemKey) =>
    get().mutate(id, c => ({
      ...c,
      inventory: c.inventory.map(i =>
        `${i.itemRef.name}|${i.itemRef.source}`.toLowerCase() === itemKey
          ? { ...i, equipped: !i.equipped }
          : i,
      ),
    })),

  levelUp: (id, { classIndex, hpGain, abilityBoosts, subclass }) =>
    get().mutate(id, c => {
      // 1. Increment class level (and set subclass if provided)
      const classes = c.classes.map((cl, i) =>
        i === classIndex
          ? { ...cl, level: cl.level + 1, ...(subclass ? { subclass } : {}) }
          : cl,
      );
      const newLevel = classes[classIndex].level;

      // 2. HP
      const hp = {
        ...c.hp,
        max: c.hp.max + hpGain,
        current: c.hp.current + hpGain,
      };

      // 3. Ability scores (ASI)
      const abilityScores = abilityBoosts
        ? {
            str: Math.min(20, c.abilityScores.str + (abilityBoosts.str ?? 0)),
            dex: Math.min(20, c.abilityScores.dex + (abilityBoosts.dex ?? 0)),
            con: Math.min(20, c.abilityScores.con + (abilityBoosts.con ?? 0)),
            int: Math.min(20, c.abilityScores.int + (abilityBoosts.int ?? 0)),
            wis: Math.min(20, c.abilityScores.wis + (abilityBoosts.wis ?? 0)),
            cha: Math.min(20, c.abilityScores.cha + (abilityBoosts.cha ?? 0)),
          }
        : c.abilityScores;

      // If CON went up, retroactively boost HP max by the level difference
      const conDelta = (abilityBoosts?.con ?? 0);
      const conModDelta = conDelta > 0
        ? abilityMod(abilityScores.con) - abilityMod(c.abilityScores.con)
        : 0;
      if (conModDelta > 0) {
        hp.max += conModDelta * newLevel;
        hp.current += conModDelta * newLevel;
      }

      // 4. Recalculate spell slots for the leveled class
      const classData = getClassData(classes[classIndex].classRef.name);
      let resources = [...c.resources];
      if (classData && classData.spellcasting !== 'none') {
        const newSlots = computeSpellSlots(classData.spellcasting, newLevel);
        // Keep non-slot resources; rebuild slot tracks
        const nonSlots = resources.filter(r => !r.id.startsWith('slot-') && r.id !== 'pact');
        resources = [
          ...nonSlots,
          ...newSlots.map(newTrack => {
            const existing = c.resources.find(r => r.id === newTrack.id);
            if (!existing) return newTrack; // new slot level: full
            const gained = newTrack.max - existing.max;
            return {
              ...existing,
              max: newTrack.max,
              current: Math.min(newTrack.max, existing.current + Math.max(0, gained)),
            };
          }),
        ];
      }

      return { ...c, classes, hp, abilityScores, resources };
    }),

  addCondition: (id, condition) =>
    get().mutate(id, c => {
      if ((c.conditions ?? []).includes(condition)) return c;
      return { ...c, conditions: [...(c.conditions ?? []), condition] };
    }),

  removeCondition: (id, condition) =>
    get().mutate(id, c => ({
      ...c,
      conditions: (c.conditions ?? []).filter(x => x !== condition),
    })),

  setCurrency: (id, patch) =>
    get().mutate(id, c => ({
      ...c,
      currency: { ...(c.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }), ...patch },
    })),

  spendHitDie: (id, hpGained) =>
    get().mutate(id, c => ({
      ...c,
      hitDiceSpent: (c.hitDiceSpent ?? 0) + 1,
      hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + hpGained) },
    })),

  rollDeathSave: (id, success) =>
    get().mutate(id, c => {
      const ds = c.deathSaves ?? { successes: 0, failures: 0 };
      if (success) {
        const successes = Math.min(3, ds.successes + 1);
        // 3 successes = stabilize: reset saves, HP stays 0
        return successes >= 3
          ? { ...c, deathSaves: { successes: 0, failures: 0 } }
          : { ...c, deathSaves: { ...ds, successes } };
      } else {
        return { ...c, deathSaves: { ...ds, failures: Math.min(3, ds.failures + 1) } };
      }
    }),

  resetDeathSaves: (id) =>
    get().mutate(id, c => ({ ...c, deathSaves: { successes: 0, failures: 0 } })),

  setConcentration: (id, spell) =>
    get().mutate(id, c => ({ ...c, concentration: spell })),

  exportAll: () => {
    const { characters } = get();
    return JSON.stringify({ version: 1, characters }, null, 2);
  },

  importAll: async (json) => {
    const parsed = JSON.parse(json) as { version?: number; characters: Character[] };
    const list: Character[] = Array.isArray(parsed) ? parsed : parsed.characters ?? [];
    for (const c of list) await dexieCharacterRepository.save(c);
    const all = await dexieCharacterRepository.list();
    set({ characters: all });
  },

  addPreparedSpell: (id, spell) =>
    get().mutate(id, c => {
      const already = c.preparedSpells.some(
        s => s.name === spell.name && s.source === spell.source,
      );
      return already ? c : { ...c, preparedSpells: [...c.preparedSpells, spell] };
    }),

  removePreparedSpell: (id, spell) =>
    get().mutate(id, c => ({
      ...c,
      preparedSpells: c.preparedSpells.filter(
        s => !(s.name === spell.name && s.source === spell.source),
      ),
    })),

  addKnownSpell: (id, spell) =>
    get().mutate(id, c => {
      const already = c.knownSpells.some(s => s.name === spell.name && s.source === spell.source);
      return already ? c : { ...c, knownSpells: [...c.knownSpells, spell] };
    }),

  removeKnownSpell: (id, spell) =>
    get().mutate(id, c => ({
      ...c,
      knownSpells: c.knownSpells.filter(s => !(s.name === spell.name && s.source === spell.source)),
    })),

  addFeat: (id, feat) =>
    get().mutate(id, c => {
      const already = c.feats.some(f => f.name === feat.name && f.source === feat.source);
      return already ? c : { ...c, feats: [...c.feats, feat] };
    }),

  removeFeat: (id, feat) =>
    get().mutate(id, c => ({
      ...c,
      feats: c.feats.filter(f => !(f.name === feat.name && f.source === feat.source)),
    })),
}));
