import { abilityMod, proficiencyBonus, totalLevel } from '../domain/rules';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import type { AbilityScores } from '../domain/character/types';

const ALL_SKILLS = [
  { name: 'Acrobatics',      ability: 'dex' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana',          ability: 'int' },
  { name: 'Athletics',       ability: 'str' },
  { name: 'Deception',       ability: 'cha' },
  { name: 'History',         ability: 'int' },
  { name: 'Insight',         ability: 'wis' },
  { name: 'Intimidation',    ability: 'cha' },
  { name: 'Investigation',   ability: 'int' },
  { name: 'Medicine',        ability: 'wis' },
  { name: 'Nature',          ability: 'int' },
  { name: 'Perception',      ability: 'wis' },
  { name: 'Performance',     ability: 'cha' },
  { name: 'Persuasion',      ability: 'cha' },
  { name: 'Religion',        ability: 'int' },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth',         ability: 'dex' },
  { name: 'Survival',        ability: 'wis' },
] as const;

function SkillsWidget({ character }: WidgetProps) {
  const level = totalLevel(character.classes);
  const pb = proficiencyBonus(level);

  // Sort by modifier descending, then alphabetically
  const withMods = ALL_SKILLS.map(s => {
    const proficient = character.proficiencies.skills.includes(s.name);
    const mod = abilityMod(character.abilityScores[s.ability as keyof AbilityScores]) + (proficient ? pb : 0);
    return { ...s, mod, proficient };
  }).sort((a, b) => b.mod - a.mod || a.name.localeCompare(b.name));

  return (
    <div className="p-3">
      <p className="text-xs font-semibold text-[var(--color-text-3)] uppercase tracking-wide mb-2">Skills</p>
      <div className="space-y-0.5">
        {withMods.map(({ name, ability, mod, proficient }) => (
          <div key={name} className="flex items-center gap-2 py-0.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                proficient ? 'bg-amber-500' : 'border border-[var(--color-border)]'
              }`}
            />
            <span className="flex-1 text-xs text-[var(--color-text-2)] truncate">{name}</span>
            <span className="text-xs text-[var(--color-muted)] w-6 text-center">{ability.slice(0, 3).toUpperCase()}</span>
            <span className={`text-xs font-bold w-7 text-right ${proficient ? 'text-amber-400' : 'text-[var(--color-text-3)]'}`}>
              {mod >= 0 ? '+' : ''}{mod}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

registerWidget({
  typeId: 'skills',
  label: 'Skills',
  icon: 'school',
  defaultConfig: {},
  defaultSpan: 2,
  component: SkillsWidget,
});
