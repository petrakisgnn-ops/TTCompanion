import { abilityMod, proficiencyBonus } from '../../../domain/rules';
import type { AbilityScores } from '../../../domain/character/types';

const SAVES = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
] as const;

const SKILLS = [
  { name: 'Acrobatics',     ability: 'dex' },
  { name: 'Animal Handling',ability: 'wis' },
  { name: 'Arcana',         ability: 'int' },
  { name: 'Athletics',      ability: 'str' },
  { name: 'Deception',      ability: 'cha' },
  { name: 'History',        ability: 'int' },
  { name: 'Insight',        ability: 'wis' },
  { name: 'Intimidation',   ability: 'cha' },
  { name: 'Investigation',  ability: 'int' },
  { name: 'Medicine',       ability: 'wis' },
  { name: 'Nature',         ability: 'int' },
  { name: 'Perception',     ability: 'wis' },
  { name: 'Performance',    ability: 'cha' },
  { name: 'Persuasion',     ability: 'cha' },
  { name: 'Religion',       ability: 'int' },
  { name: 'Sleight of Hand',ability: 'dex' },
  { name: 'Stealth',        ability: 'dex' },
  { name: 'Survival',       ability: 'wis' },
] as const;

interface SkillsSectionProps {
  scores: AbilityScores;
  profSkills: string[];
  profSaves: string[];
  totalLevel: number;
}

function modStr(n: number): string {
  return `${n >= 0 ? '+' : ''}${n}`;
}

function ProfDot({ proficient }: { proficient: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
        proficient ? 'bg-amber-500' : 'border border-slate-600'
      }`}
    />
  );
}

export function SkillsSection({ scores, profSkills, profSaves, totalLevel }: SkillsSectionProps) {
  const pb = proficiencyBonus(totalLevel);

  return (
    <div className="space-y-4">
      {/* Saving Throws */}
      <div className="bg-[var(--color-card)] rounded-xl p-3">
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
          Saving Throws
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {SAVES.map(({ key, label }) => {
            const proficient = profSaves.includes(key);
            const mod = abilityMod(scores[key]) + (proficient ? pb : 0);
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <ProfDot proficient={proficient} />
                <span className="flex-1 text-[var(--color-text-2)]">{label}</span>
                <span className={`font-mono font-semibold text-xs ${proficient ? 'text-amber-400' : 'text-[var(--color-muted)]'}`}>
                  {modStr(mod)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="bg-[var(--color-card)] rounded-xl p-3">
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
          Skills
        </h3>
        <div className="space-y-1">
          {SKILLS.map(({ name, ability }) => {
            const proficient = profSkills.includes(name);
            const mod = abilityMod(scores[ability as keyof AbilityScores]) + (proficient ? pb : 0);
            const abilLabel = ability.toUpperCase().slice(0, 3);
            return (
              <div key={name} className="flex items-center gap-2 text-sm">
                <ProfDot proficient={proficient} />
                <span className="flex-1 text-[var(--color-text-2)]">{name}</span>
                <span className="text-[var(--color-disabled)] text-xs mr-1">{abilLabel}</span>
                <span className={`font-mono font-semibold text-xs w-7 text-right ${proficient ? 'text-amber-400' : 'text-[var(--color-muted)]'}`}>
                  {modStr(mod)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
