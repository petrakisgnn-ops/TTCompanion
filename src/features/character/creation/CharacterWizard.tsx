import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AbilityScores, Character, Currency, InventoryItem } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import { computeSpellSlots, maxHp } from '../../../domain/rules/spellSlots';
import { computeClassResources } from '../../../domain/rules/classResources';
import { abilityMod } from '../../../domain/rules';
import { getClassData, subclassLevel } from '../../../domain/rules/classData';
import { CLASS_SKILLS } from '../../../domain/rules/classSkills';
import { useCharacterStore } from '../../../stores/characterStore';
import { StepRace } from './StepRace';
import { StepClass } from './StepClass';
import { StepAbilities } from './StepAbilities';
import { StepBackground } from './StepBackground';
import { StepSkills } from './StepSkills';
import { StepEquipment } from './StepEquipment';
import { StepFinalize } from './StepFinalize';

const STEPS = ['Race', 'Class', 'Background', 'Abilities', 'Skills', 'Equipment', 'Finalize'];

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
  languages: string[];
  tools: string[];
  /** Bonus skill/feat granted by some race variants (e.g. Variant Human) — see StepSkills. */
  raceBonusSkill: string | null;
  raceBonusFeat: RefId | null;
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
    languages: [],
    tools: [],
    raceBonusSkill: null,
    raceBonusFeat: null,
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

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return data.raceRef !== null;
      case 1: {
        if (data.classRef === null) return false;
        // Cleric/Sorcerer/Warlock must pick their subclass here — it's the only chance they get.
        if (subclassLevel(data.classRef.name) === 1) return data.subclassRef !== null;
        return true;
      }
      case 2: return data.backgroundRef !== null;
      case 3: return Object.values(data.abilityScores).every(v => v >= 1);
      case 4: {
        // Skills step: must have picked the required number of class skills
        // (background skills are auto-granted so we just check we have at least the class count)
        const classChoice = data.classRef ? CLASS_SKILLS[data.classRef.name] : null;
        const required = classChoice?.count ?? 0;
        // Count only class-picked skills (background skills were seeded in; we allow proceeding
        // as background skills alone satisfy the step if class has 0 picks)
        return data.skills.length > 0 || required === 0;
      }
      case 5: return true; // Equipment step: choices are optional, always advanceable
      case 6: return data.name.trim().length > 0;
      default: return false;
    }
  };

  const handleFinish = async () => {
    const {
      raceRef, subraceRef, classRef, subclassRef, level, abilityScores, abilityBonus, backgroundRef,
      skills, languages, tools, raceBonusFeat,
      resolvedInventory, resolvedCurrency, equipmentNotes,
      alignment, personalityTrait, personalityIdeal, personalityBond, personalityFlaw,
      age, height, weight, eyes, skin, hair, name,
    } = data;
    if (!raceRef || !classRef || !backgroundRef) return;

    const backgroundFeats = await resolveBackgroundFeats(backgroundRef);
    const grantedFeats = raceBonusFeat ? [...backgroundFeats, raceBonusFeat] : backgroundFeats;

    // Bake the resolved race (5e) / background (5.5e) ability bonus into the final
    // scores now — the character sheet just deals in real final scores from here on.
    const finalScores: AbilityScores = {
      str: abilityScores.str + (abilityBonus.str ?? 0),
      dex: abilityScores.dex + (abilityBonus.dex ?? 0),
      con: abilityScores.con + (abilityBonus.con ?? 0),
      int: abilityScores.int + (abilityBonus.int ?? 0),
      wis: abilityScores.wis + (abilityBonus.wis ?? 0),
      cha: abilityScores.cha + (abilityBonus.cha ?? 0),
    };

    const cls = getClassData(classRef.name);
    const conMod = abilityMod(finalScores.con);
    const hp = cls
      ? { max: maxHp(cls.hitDie, level, conMod), current: 0, temp: 0 }
      : { max: 10, current: 0, temp: 0 };
    hp.current = hp.max;

    const resources = cls
      ? [...computeSpellSlots(cls.spellcasting, level), ...computeClassResources(classRef.name, level, finalScores)]
      : [];

    const character: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      classes: [{ classRef, level, subclass: subclassRef ?? undefined }],
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
        skills,
        saves: cls?.saves ?? [],
        weapons: [],
        armor: [],
        tools,
        languages,
      },
      hitDiceSpent: 0,
      deathSaves: { successes: 0, failures: 0 },
      concentration: null,
      conditions: [],
      knownSpells: [],
      preparedSpells: [],
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
          <span className="text-sm font-semibold">{STEPS[step]}</span>
          <span className="text-xs text-[var(--color-faint)]">{step + 1} / {STEPS.length}</span>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((_, i) => (
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
        {step === 0 && <StepRace {...stepProps} />}
        {step === 1 && <StepClass {...stepProps} />}
        {step === 2 && <StepBackground {...stepProps} />}
        {step === 3 && <StepAbilities {...stepProps} />}
        {step === 4 && <StepSkills {...stepProps} />}
        {step === 5 && <StepEquipment {...stepProps} />}
        {step === 6 && <StepFinalize {...stepProps} />}
      </div>

      {/* Next / Finish button — fixed above the bottom nav */}
      <div className="fixed bottom-20 left-0 right-0 z-20 bg-[var(--color-app)]/95 backdrop-blur border-t border-[var(--color-border)] p-4">
        {step < STEPS.length - 1 ? (
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
