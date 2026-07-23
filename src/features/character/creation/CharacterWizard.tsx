import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AbilityScores, Character, Currency, InventoryItem, KnownSpellRef } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import { maxHp } from '../../../domain/rules/spellSlots';
import { recomputeAllResources } from '../../../domain/rules/resources';
import { hpBonusPerLevel } from '../../../domain/rules/hpBonus';
import { abilityMod } from '../../../domain/rules';
import { getClassData, subclassLevel, asiLevelsUpTo, type AbilityKey } from '../../../domain/rules/classData';
import { classHasSpellChoices } from '../../../domain/rules/spellcasting';
import {
  parseFeatProficiencies, resolveFeatProficiencies,
  EMPTY_FEAT_PROF_SELECTION, type FeatProfSelection, type RawFeat,
} from '../../../domain/rules/featRewards';
import { CLASS_SKILLS } from '../../../domain/rules/classSkills';
import { useCharacterStore } from '../../../stores/characterStore';
import { StepRace } from './StepRace';
import { StepClass } from './StepClass';
import { StepAbilities } from './StepAbilities';
import { StepBackground } from './StepBackground';
import { StepSkills } from './StepSkills';
import { StepSpells } from './StepSpells';
import { StepEquipment } from './StepEquipment';
import { StepFinalize } from './StepFinalize';

/** Wizard steps in order; "Spells" is inserted after "Skills" only for classes that can pick spells. */
const BASE_STEPS = ['Race', 'Class', 'Background', 'Abilities', 'Skills', 'Equipment', 'Finalize'] as const;
type StepName = (typeof BASE_STEPS)[number] | 'Spells';

/**
 * One Ability Score Improvement slot the character has already earned by being created above
 * level 1 (levels 4, 8, … for its class — see asiLevelsUpTo). The player resolves each slot as
 * a +2/+1+1 ability bump or a feat; `boosts` holds the resolved ability increases (a feat's
 * fixed/half-feat increases included) so finalizing just sums them. See StepAbilities / AsiChoicesSection.
 */
export interface AsiChoice {
  mode: '+2' | '+1+1' | 'feat';
  one: AbilityKey | null;
  two: (AbilityKey | null)[];
  feat: RefId | null;
  featAbility: AbilityKey | null;
  /** Proficiency/expertise picks for a chosen feat's choice groups (Prodigy, Skilled, …). */
  featProfSel: FeatProfSelection;
  boosts: Partial<AbilityScores>;
  complete: boolean;
}

export const BLANK_ASI_CHOICE: AsiChoice = {
  mode: '+2', one: null, two: [null, null], feat: null, featAbility: null,
  featProfSel: EMPTY_FEAT_PROF_SELECTION, boosts: {}, complete: false,
};

const ASI_ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Sums the resolved ability boosts across every ASI slot. */
export function sumAsiBoosts(choices: AsiChoice[]): Partial<AbilityScores> {
  const out: Partial<AbilityScores> = {};
  for (const c of choices) {
    for (const k of ASI_ABILITY_KEYS) {
      const v = c.boosts[k];
      if (v) out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

export interface WizardData {
  raceRef: RefId | null;
  subraceRef: RefId | null;
  classRef: RefId | null;
  /** Only set (and required) for classes that pick their subclass at level 1 — see StepClass. */
  subclassRef: RefId | null;
  level: number;
  abilityScores: AbilityScores;
  /** Resolved race (5e) or background (5.5e) ability bonus — see StepAbilities. */
  abilityBonus: Partial<AbilityScores>;
  backgroundRef: RefId | null;
  skills: string[];
  /** Skills chosen for a background's `skillProficiencies` choice grant (e.g. Cloistered Scholar). */
  bgSkillChoices: string[];
  /** Skills chosen for Expertise (Rogue/Bard) — a subset of `skills`. See StepSkills. */
  expertise: string[];
  languages: string[];
  tools: string[];
  /** Bonus skill/feat granted by some race variants (e.g. Variant Human) — see StepSkills. */
  raceBonusSkill: string | null;
  raceBonusFeat: RefId | null;
  /** Proficiency/expertise picks for the race bonus feat's choice groups, if it grants any. */
  raceBonusFeatProfSel: FeatProfSelection;
  /** Skills chosen for a race's `skillProficiencies` choice grant (e.g. Half-Elf's any-2). */
  raceSkillChoices: string[];
  /** ASI/feat choices earned by starting above level 1, one per slot — see AsiChoicesSection. */
  asiChoices: AsiChoice[];
  /** Class/subclass option-choices (Fighting Style, Invocations, Elemental Disciplines, …) — see ClassOptionsPicker. */
  optionalFeatures: RefId[];
  /** Spells learned (known casters + Wizard spellbook + cantrips) — see StepSpells. */
  knownSpells: KnownSpellRef[];
  /** Spells prepared (Cleric/Druid/Paladin/Artificer/Wizard) — see StepSpells. */
  preparedSpells: RefId[];
  /** Resolved class/background starting equipment — see StepEquipment. */
  resolvedInventory: InventoryItem[];
  resolvedCurrency: Currency;
  /** Freeform (non-catalog) starting equipment, e.g. "vestments" — appended to character notes. */
  equipmentNotes: string;
  alignment: string | null;
  personalityTrait: string;
  personalityIdeal: string;
  personalityBond: string;
  personalityFlaw: string;
  age: string;
  height: string;
  weight: string;
  eyes: string;
  skin: string;
  hair: string;
  name: string;
}

const BLANK_SCORES: AbilityScores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
const ZERO_CURRENCY: Currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

/**
 * The character's real ability scores from the draft: base + racial/background bonus + earned
 * ASI/feat boosts, capped at 20 for any ability an ASI touched. Shared by the finalize summary,
 * the Spells step (spellcasting modifier), and character creation.
 */
export function resolveFinalScores(data: WizardData): AbilityScores {
  const asiBoosts = data.classRef
    ? sumAsiBoosts(data.asiChoices.slice(0, asiLevelsUpTo(data.classRef.name, data.level).length))
    : {};
  const f = (k: AbilityKey): number => {
    const raw = data.abilityScores[k] + (data.abilityBonus[k] ?? 0) + (asiBoosts[k] ?? 0);
    return asiBoosts[k] ? Math.min(20, raw) : raw;
  };
  return { str: f('str'), dex: f('dex'), con: f('con'), int: f('int'), wis: f('wis'), cha: f('cha') };
}

/**
 * Some backgrounds grant a feat outright (e.g. Strixhaven college backgrounds grant
 * "Strixhaven Initiate", which is what actually carries their bonus cantrip/spell
 * options). Resolve backgroundRef -> background.feats -> matching feats.json entries
 * so the feat (and whatever it grants) ends up on the new character.
 */
async function resolveBackgroundFeats(backgroundRef: RefId): Promise<RefId[]> {
  try {
    const [bgRes, featRes] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`),
      fetch(`${import.meta.env.BASE_URL}data/feats.json`),
    ]);
    const bgJson: { background: { name: string; source: string; feats?: Record<string, boolean>[] }[] } = await bgRes.json();
    const featJson: { feat: { name: string; source: string }[] } = await featRes.json();

    const background = bgJson.background.find(
      b => b.name === backgroundRef.name && b.source === backgroundRef.source,
    );
    if (!background?.feats) return [];

    const keys: string[] = [];
    for (const grant of background.feats) {
      for (const [key, granted] of Object.entries(grant)) {
        if (granted) keys.push(key);
      }
    }

    const resolved: RefId[] = [];
    for (const key of keys) {
      const [rawNameWithQualifier, rawSource] = key.split('|');
      // Some grants parameterize the feat, e.g. "magic initiate; cleric|xphb" —
      // the part after ";" (which class/list to draw from) isn't part of the feat's
      // own name, so only match on what's before it.
      const rawName = rawNameWithQualifier.split(';')[0].trim();
      const match = featJson.feat.find(
        f => f.name.toLowerCase() === rawName.toLowerCase() &&
          (!rawSource || f.source.toLowerCase() === rawSource.toLowerCase()),
      );
      if (match) resolved.push({ name: match.name, source: match.source });
    }
    return resolved;
  } catch {
    return [];
  }
}

/**
 * Resolves the proficiency/expertise grants of every feat a new character gets (from its
 * background, race variant, and ASI picks) — fixed grants plus the player's choices — into one
 * merged, deduped set to fold into the character's proficiencies. Background feats carry no
 * choice UI, so only their fixed grants apply (their choices, if any, would be spell-only).
 */
async function resolveFeatProfGrants(picks: { feat: RefId; sel: FeatProfSelection }[]): Promise<FeatProfSelection> {
  const merged: FeatProfSelection = { skills: [], tools: [], languages: [], expertise: [] };
  if (picks.length === 0) return merged;
  try {
    const json: { feat: RawFeat[] } = await fetch(`${import.meta.env.BASE_URL}data/feats.json`).then(r => r.json());
    for (const { feat, sel } of picks) {
      const raw = json.feat.find(f => f.name === feat.name && f.source === feat.source);
      if (!raw) continue;
      const r = resolveFeatProficiencies(parseFeatProficiencies(raw), sel);
      merged.skills.push(...r.skills);
      merged.tools.push(...r.tools);
      merged.languages.push(...r.languages);
      merged.expertise.push(...r.expertise);
    }
  } catch { /* leave whatever resolved so far */ }
  return {
    skills: [...new Set(merged.skills)],
    tools: [...new Set(merged.tools)],
    languages: [...new Set(merged.languages)],
    expertise: [...new Set(merged.expertise)],
  };
}

export function CharacterWizard() {
  const navigate = useNavigate();
  const createCharacter = useCharacterStore(s => s.create);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    raceRef: null,
    subraceRef: null,
    classRef: null,
    subclassRef: null,
    level: 1,
    abilityScores: BLANK_SCORES,
    abilityBonus: {},
    backgroundRef: null,
    skills: [],
    bgSkillChoices: [],
    expertise: [],
    languages: [],
    tools: [],
    raceBonusSkill: null,
    raceBonusFeat: null,
    raceBonusFeatProfSel: EMPTY_FEAT_PROF_SELECTION,
    raceSkillChoices: [],
    asiChoices: [],
    optionalFeatures: [],
    knownSpells: [],
    preparedSpells: [],
    resolvedInventory: [],
    resolvedCurrency: ZERO_CURRENCY,
    equipmentNotes: '',
    alignment: null,
    personalityTrait: '',
    personalityIdeal: '',
    personalityBond: '',
    personalityFlaw: '',
    age: '',
    height: '',
    weight: '',
    eyes: '',
    skin: '',
    hair: '',
    name: '',
  });

  const patch = (partial: Partial<WizardData>) =>
    setData(d => ({ ...d, ...partial }));

  // The subclass, only once the creation level has reached the level it's chosen at.
  const activeSubclassName = data.classRef && data.subclassRef && data.level >= subclassLevel(data.classRef.name)
    ? data.subclassRef.name
    : undefined;
  // Insert a Spells step (after Skills) only for classes that actually pick spells at this level.
  const hasSpellsStep = data.classRef
    ? classHasSpellChoices(data.classRef.name, data.level, activeSubclassName)
    : false;
  const steps = useMemo<StepName[]>(() => {
    if (!hasSpellsStep) return [...BASE_STEPS];
    const arr: StepName[] = [...BASE_STEPS];
    arr.splice(arr.indexOf('Skills') + 1, 0, 'Spells');
    return arr;
  }, [hasSpellsStep]);
  const stepName = steps[Math.min(step, steps.length - 1)];

  const canAdvance = (): boolean => {
    switch (stepName) {
      case 'Race': return data.raceRef !== null;
      case 'Class': {
        if (data.classRef === null) return false;
        // A subclass is required whenever the creation level has already reached the
        // class's subclass level (always true for Cleric/Sorcerer/Warlock at 1).
        if (data.level >= subclassLevel(data.classRef.name)) return data.subclassRef !== null;
        return true;
      }
      case 'Background': return data.backgroundRef !== null;
      case 'Abilities': {
        if (!Object.values(data.abilityScores).every(v => v >= 1)) return false;
        // Every ASI/feat slot earned by the starting level must be resolved before continuing.
        const slots = data.classRef ? asiLevelsUpTo(data.classRef.name, data.level).length : 0;
        const chosen = data.asiChoices.slice(0, slots);
        return chosen.length === slots && chosen.every(c => c.complete);
      }
      case 'Skills': {
        // Must have picked the required number of class skills (background skills are auto-granted,
        // so we just check we have at least the class count).
        const classChoice = data.classRef ? CLASS_SKILLS[data.classRef.name] : null;
        const required = classChoice?.count ?? 0;
        return data.skills.length > 0 || required === 0;
      }
      case 'Spells': return true; // spell picks are soft-capped — always advanceable
      case 'Equipment': return true; // choices are optional
      case 'Finalize': return data.name.trim().length > 0;
      default: return false;
    }
  };

  const handleFinish = async () => {
    const {
      raceRef, subraceRef, classRef, subclassRef, level, backgroundRef,
      skills, expertise, languages, tools, raceBonusFeat, raceBonusFeatProfSel, asiChoices, optionalFeatures,
      knownSpells, preparedSpells,
      resolvedInventory, resolvedCurrency, equipmentNotes,
      alignment, personalityTrait, personalityIdeal, personalityBond, personalityFlaw,
      age, height, weight, eyes, skin, hair, name,
    } = data;
    if (!raceRef || !classRef || !backgroundRef) return;

    // Only slots the starting level actually earns count (guards against stale entries left
    // behind if the level was lowered after choices were made).
    const asiSlotCount = asiLevelsUpTo(classRef.name, level).length;
    const asiFeats = asiChoices.slice(0, asiSlotCount)
      .filter(c => c.mode === 'feat' && c.feat)
      .map(c => c.feat!);

    const backgroundFeats = await resolveBackgroundFeats(backgroundRef);
    const grantedFeats = [
      ...backgroundFeats,
      ...(raceBonusFeat ? [raceBonusFeat] : []),
      ...asiFeats,
    ];

    // Proficiency/expertise grants from every feat the character gets — background feats
    // (fixed only), the race variant bonus feat, and ASI feats (each with the player's choices).
    const featProfs = await resolveFeatProfGrants([
      ...backgroundFeats.map(f => ({ feat: f, sel: EMPTY_FEAT_PROF_SELECTION })),
      ...(raceBonusFeat ? [{ feat: raceBonusFeat, sel: raceBonusFeatProfSel }] : []),
      ...asiChoices.slice(0, asiSlotCount)
        .filter(c => c.mode === 'feat' && c.feat)
        .map(c => ({ feat: c.feat!, sel: c.featProfSel })),
    ]);
    const mergedSkills = [...new Set([...skills, ...featProfs.skills])];

    // Real final scores: base + racial/background bonus + earned ASI/feat boosts (capped at 20).
    const finalScores = resolveFinalScores(data);

    const finalSubclass = subclassRef && level >= subclassLevel(classRef.name) ? subclassRef : undefined;

    const cls = getClassData(classRef.name);
    const conMod = abilityMod(finalScores.con);
    // Hill Dwarf / Draconic Bloodline grant +1 HP max per level (see hpBonusPerLevel).
    const hpBonus = hpBonusPerLevel({
      race: raceRef, subrace: subraceRef,
      classes: [{ classRef, level, subclass: finalSubclass }],
    } as Character) * level;
    const hp = cls
      ? { max: maxHp(cls.hitDie, level, conMod) + hpBonus, current: 0, temp: 0 }
      : { max: 10 + hpBonus, current: 0, temp: 0 };
    hp.current = hp.max;

    // Same resource derivation the sheet uses from here on (slots incl. subclass
    // casters like Eldritch Knight, class pools like Rage/Ki) — one code path.
    const resources = recomputeAllResources(
      [{ classRef, level, subclass: finalSubclass }],
      [],
      finalScores,
    );

    const character: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      // finalSubclass drops a lingering pick if the level was lowered back below the
      // class's subclass level after choosing one.
      classes: [{ classRef, level, subclass: finalSubclass }],
      race: raceRef,
      subrace: subraceRef,
      background: backgroundRef,
      alignment,
      personality: {
        trait: personalityTrait,
        ideal: personalityIdeal,
        bond: personalityBond,
        flaw: personalityFlaw,
      },
      appearance: { age, height, weight, eyes, skin, hair },
      abilityScores: finalScores,
      hp,
      proficiencies: {
        skills: mergedSkills,
        saves: cls?.saves ?? [],
        weapons: cls?.startingProficiency.weapons ?? [],
        armor: cls?.startingProficiency.armor ?? [],
        tools: [...new Set([...tools, ...featProfs.tools])],
        languages: [...new Set([...languages, ...featProfs.languages])],
        // Expertise from picks + feats, kept to skills the character is actually proficient in.
        expertise: [...new Set([...expertise, ...featProfs.expertise])].filter(s => mergedSkills.includes(s)),
      },
      hitDiceSpent: 0,
      deathSaves: { successes: 0, failures: 0 },
      concentration: null,
      conditions: [],
      knownSpells,
      preparedSpells,
      optionalFeatures,
      inventory: resolvedInventory,
      feats: grantedFeats,
      resources,
      currency: resolvedCurrency,
      dashboard: { widgets: [] },
      notes: equipmentNotes ? `Starting equipment: ${equipmentNotes.split('\n').join(', ')}` : '',
    };

    await createCharacter(character);
    navigate(`/characters/${character.id}`);
  };

  const stepProps = { data, patch };

  return (
    <div>
      {/* Progress header */}
      <div className="sticky top-0 z-10 bg-[var(--color-app)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => (step === 0 ? navigate('/characters') : setStep(s => s - 1))}
            className="text-[var(--color-muted)] text-sm hover:text-[var(--color-text)] min-w-[44px]"
          >
            ← {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <span className="text-sm font-semibold">{stepName}</span>
          <span className="text-xs text-[var(--color-faint)]">{step + 1} / {steps.length}</span>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < step ? 'w-6 bg-amber-500' :
                i === step ? 'w-6 bg-amber-400' :
                'w-3 bg-[var(--color-raised)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content — pb-24 keeps the last item above the fixed button */}
      <div className="pb-24">
        {stepName === 'Race' && <StepRace {...stepProps} />}
        {stepName === 'Class' && <StepClass {...stepProps} />}
        {stepName === 'Background' && <StepBackground {...stepProps} />}
        {stepName === 'Abilities' && <StepAbilities {...stepProps} />}
        {stepName === 'Skills' && <StepSkills {...stepProps} />}
        {stepName === 'Spells' && <StepSpells {...stepProps} />}
        {stepName === 'Equipment' && <StepEquipment {...stepProps} />}
        {stepName === 'Finalize' && <StepFinalize {...stepProps} />}
      </div>

      {/* Next / Finish button — fixed above the bottom nav */}
      <div className="fixed bottom-20 left-0 right-0 z-20 bg-[var(--color-app)]/95 backdrop-blur border-t border-[var(--color-border)] p-4">
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors
              bg-amber-500 text-slate-900 hover:bg-amber-400
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={!canAdvance()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors
              bg-amber-500 text-slate-900 hover:bg-amber-400
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Character
          </button>
        )}
      </div>
    </div>
  );
}
