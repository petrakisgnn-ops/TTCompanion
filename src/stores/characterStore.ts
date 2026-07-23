import { create } from 'zustand';
import { dexieCharacterRepository } from '../data/repositories/DexieCharacterRepository';
import type { Character, Currency, ResourceTrack, AbilityScores, KnownSpellRef } from '../domain/character/types';
import type { RefId } from '../domain/reference/types';
import { recomputeAllResources } from '../domain/rules/resources';
import { applyAbilityBoosts } from '../domain/rules/abilityBoosts';
import { totalLevel } from '../domain/rules';
import type { FeatProfSelection } from '../domain/rules/featRewards';

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
  /** Multiclass into a class the character doesn't have yet — starts at level 1 in it. */
  addClass: (id: string, opts: {
    classRef: RefId;
    hpGain: number;
    subclass?: RefId;
    proficiencies: { armor: string[]; weapons: string[]; tool?: string; skill?: string };
  }) => Promise<void>;
  addCondition: (id: string, condition: string) => Promise<void>;
  removeCondition: (id: string, condition: string) => Promise<void>;
  addLanguage: (id: string, language: string) => Promise<void>;
  removeLanguage: (id: string, language: string) => Promise<void>;
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
  addKnownSpell: (id: string, spell: KnownSpellRef) => Promise<void>;
  removeKnownSpell: (id: string, spell: KnownSpellRef) => Promise<void>;
  /** `abilityBoosts` carries a half-feat's ability increase (fixed part + the player's choice, already
   * merged by the caller); `profGrants` carries the feat's resolved skill/tool/language/expertise
   * proficiencies (fixed + chosen), which are merged into the character's proficiencies. */
  addFeat: (id: string, feat: RefId, abilityBoosts?: Partial<AbilityScores>, profGrants?: FeatProfSelection) => Promise<void>;
  removeFeat: (id: string, feat: RefId) => Promise<void>;
  addOptionalFeature: (id: string, feature: RefId) => Promise<void>;
  removeOptionalFeature: (id: string, feature: RefId) => Promise<void>;
  toggleExpertise: (id: string, skill: string) => Promise<void>;
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

      // 2. HP from the new level's hit die
      const rolledHp = {
        ...c.hp,
        max: c.hp.max + hpGain,
        current: c.hp.current + hpGain,
      };

      // 3. Ability scores (ASI) — CON-mod increases retroactively add HP per total
      // character level (PHB p.173), shared logic with half-feat bonuses.
      const boosted = abilityBoosts
        ? applyAbilityBoosts(c.abilityScores, rolledHp, abilityBoosts, totalLevel(classes))
        : { abilityScores: c.abilityScores, hp: rolledHp };
      const { abilityScores, hp } = boosted;

      // 4. Recalculate spell slots (combined across all classes — see recomputeAllResources)
      // and every class's own resource pools (Rage, Ki, Channel Divinity, ...). Runs
      // unconditionally over ALL classes, not just the one leveled — a multiclass caster's
      // combined slot count depends on every class's level, not just the one that changed.
      const resources = recomputeAllResources(classes, c.resources, abilityScores, c.edition);

      return { ...c, classes, hp, abilityScores, resources };
    }),

  addClass: (id, { classRef, hpGain, subclass, proficiencies }) =>
    get().mutate(id, c => {
      if (c.classes.some(cl => cl.classRef.name === classRef.name)) return c; // already have it

      const classes = [...c.classes, { classRef, level: 1, ...(subclass ? { subclass } : {}) }];

      const hp = { ...c.hp, max: c.hp.max + hpGain, current: c.hp.current + hpGain };

      const mergedSkills = proficiencies.skill && !c.proficiencies.skills.includes(proficiencies.skill)
        ? [...c.proficiencies.skills, proficiencies.skill]
        : c.proficiencies.skills;
      const mergedTools = proficiencies.tool && !c.proficiencies.tools.includes(proficiencies.tool)
        ? [...c.proficiencies.tools, proficiencies.tool]
        : c.proficiencies.tools;
      const mergedArmor = [...new Set([...c.proficiencies.armor, ...proficiencies.armor])];
      const mergedWeapons = [...new Set([...c.proficiencies.weapons, ...proficiencies.weapons])];

      const resources = recomputeAllResources(classes, c.resources, c.abilityScores, c.edition);

      return {
        ...c,
        classes,
        hp,
        proficiencies: {
          ...c.proficiencies,
          skills: mergedSkills,
          tools: mergedTools,
          armor: mergedArmor,
          weapons: mergedWeapons,
        },
        resources,
      };
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

  addLanguage: (id, language) =>
    get().mutate(id, c => {
      if (c.proficiencies.languages.includes(language)) return c;
      return { ...c, proficiencies: { ...c.proficiencies, languages: [...c.proficiencies.languages, language] } };
    }),

  removeLanguage: (id, language) =>
    get().mutate(id, c => ({
      ...c,
      proficiencies: { ...c.proficiencies, languages: c.proficiencies.languages.filter(l => l !== language) },
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
      // Matched on name+source+grantedBy so a granted copy (e.g. an innate feat
      // spell) and a normally-learned copy of the same spell can coexist — they
      // follow different casting rules.
      const already = c.knownSpells.some(
        s => s.name === spell.name && s.source === spell.source && (s.grantedBy ?? null) === (spell.grantedBy ?? null),
      );
      return already ? c : { ...c, knownSpells: [...c.knownSpells, spell] };
    }),

  removeKnownSpell: (id, spell) =>
    get().mutate(id, c => ({
      ...c,
      knownSpells: c.knownSpells.filter(
        s => !(s.name === spell.name && s.source === spell.source && (s.grantedBy ?? null) === (spell.grantedBy ?? null)),
      ),
    })),

  addFeat: (id, feat, abilityBoosts, profGrants) =>
    get().mutate(id, c => {
      const already = c.feats.some(f => f.name === feat.name && f.source === feat.source);
      if (already) return c;
      // Merge the feat's proficiency grants (fixed + chosen) into the character, deduped.
      const proficiencies = profGrants ? {
        ...c.proficiencies,
        skills: [...new Set([...c.proficiencies.skills, ...profGrants.skills])],
        tools: [...new Set([...c.proficiencies.tools, ...profGrants.tools])],
        languages: [...new Set([...c.proficiencies.languages, ...profGrants.languages])],
        expertise: [...new Set([...c.proficiencies.expertise, ...profGrants.expertise])],
      } : c.proficiencies;
      const withFeat = { ...c, feats: [...c.feats, feat], proficiencies };
      if (!abilityBoosts || Object.keys(abilityBoosts).length === 0) return withFeat;
      // Half-feat: apply its ability increase (CON retro-HP handled inside), then
      // recompute resources since pools like Bardic Inspiration key off ability mods.
      const boosted = applyAbilityBoosts(c.abilityScores, c.hp, abilityBoosts, totalLevel(c.classes));
      return {
        ...withFeat,
        abilityScores: boosted.abilityScores,
        hp: boosted.hp,
        resources: recomputeAllResources(c.classes, c.resources, boosted.abilityScores, c.edition),
      };
    }),

  removeFeat: (id, feat) =>
    get().mutate(id, c => ({
      ...c,
      feats: c.feats.filter(f => !(f.name === feat.name && f.source === feat.source)),
    })),

  addOptionalFeature: (id, feature) =>
    get().mutate(id, c => {
      const already = c.optionalFeatures.some(f => f.name === feature.name && f.source === feature.source);
      return already ? c : { ...c, optionalFeatures: [...c.optionalFeatures, feature] };
    }),

  removeOptionalFeature: (id, feature) =>
    get().mutate(id, c => ({
      ...c,
      optionalFeatures: c.optionalFeatures.filter(f => !(f.name === feature.name && f.source === feature.source)),
    })),

  toggleExpertise: (id, skill) =>
    get().mutate(id, c => {
      const has = c.proficiencies.expertise.includes(skill);
      return {
        ...c,
        proficiencies: {
          ...c.proficiencies,
          expertise: has
            ? c.proficiencies.expertise.filter(s => s !== skill)
            : [...c.proficiencies.expertise, skill],
        },
      };
    }),
}));
