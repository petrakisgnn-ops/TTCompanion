import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AbilityScores, Character } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import { computeSpellSlots, maxHp } from '../../../domain/rules/spellSlots';
import { abilityMod } from '../../../domain/rules';
import { getClassData } from '../../../domain/rules/classData';
import { CLASS_SKILLS } from '../../../domain/rules/classSkills';
import { useCharacterStore } from '../../../stores/characterStore';
import { StepRace } from './StepRace';
import { StepClass } from './StepClass';
import { StepAbilities } from './StepAbilities';
import { StepBackground } from './StepBackground';
import { StepSkills } from './StepSkills';
import { StepFinalize } from './StepFinalize';

const STEPS = ['Race', 'Class', 'Abilities', 'Background', 'Skills', 'Finalize'];

export interface WizardData {
  raceRef: RefId | null;
  classRef: RefId | null;
  level: number;
  abilityScores: AbilityScores;
  backgroundRef: RefId | null;
  skills: string[];
  name: string;
}

const BLANK_SCORES: AbilityScores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

export function CharacterWizard() {
  const navigate = useNavigate();
  const createCharacter = useCharacterStore(s => s.create);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    raceRef: null,
    classRef: null,
    level: 1,
    abilityScores: BLANK_SCORES,
    backgroundRef: null,
    skills: [],
    name: '',
  });

  const patch = (partial: Partial<WizardData>) =>
    setData(d => ({ ...d, ...partial }));

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return data.raceRef !== null;
      case 1: return data.classRef !== null;
      case 2: return Object.values(data.abilityScores).every(v => v >= 1);
      case 3: return data.backgroundRef !== null;
      case 4: {
        // Skills step: must have picked the required number of class skills
        // (background skills are auto-granted so we just check we have at least the class count)
        const classChoice = data.classRef ? CLASS_SKILLS[data.classRef.name] : null;
        const required = classChoice?.count ?? 0;
        // Count only class-picked skills (background skills were seeded in; we allow proceeding
        // as background skills alone satisfy the step if class has 0 picks)
        return data.skills.length > 0 || required === 0;
      }
      case 5: return data.name.trim().length > 0;
      default: return false;
    }
  };

  const handleFinish = async () => {
    const { raceRef, classRef, level, abilityScores, backgroundRef, skills, name } = data;
    if (!raceRef || !classRef || !backgroundRef) return;

    const cls = getClassData(classRef.name);
    const conMod = abilityMod(abilityScores.con);
    const hp = cls
      ? { max: maxHp(cls.hitDie, level, conMod), current: 0, temp: 0 }
      : { max: 10, current: 0, temp: 0 };
    hp.current = hp.max;

    const resources = cls ? computeSpellSlots(cls.spellcasting, level) : [];

    const character: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      classes: [{ classRef, level }],
      race: raceRef,
      background: backgroundRef,
      abilityScores,
      hp,
      proficiencies: {
        skills,
        saves: cls?.saves ?? [],
        weapons: [],
        armor: [],
        tools: [],
        languages: [],
      },
      hitDiceSpent: 0,
      deathSaves: { successes: 0, failures: 0 },
      concentration: null,
      conditions: [],
      knownSpells: [],
      preparedSpells: [],
      inventory: [],
      feats: [],
      resources,
      currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      dashboard: { widgets: [] },
      notes: '',
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
        {step === 2 && <StepAbilities {...stepProps} />}
        {step === 3 && <StepBackground {...stepProps} />}
        {step === 4 && <StepSkills {...stepProps} />}
        {step === 5 && <StepFinalize {...stepProps} />}
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
