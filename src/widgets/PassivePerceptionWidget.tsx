import { abilityMod, passiveScore, proficiencyBonus, totalLevel } from '../domain/rules';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

function PassivePerceptionWidget({ character }: WidgetProps) {
  const level = totalLevel(character.classes);
  const pb = proficiencyBonus(level);
  const proficient = character.proficiencies.skills.includes('Perception');
  const expert = character.proficiencies.expertise?.includes('Perception') ?? false;
  const wisMod = abilityMod(character.abilityScores.wis);
  const passive = passiveScore(wisMod, pb, proficient, expert);

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-1">
      <span className="text-4xl font-bold">{passive}</span>
      <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Passive Perception</span>
      {proficient && (
        <span className="text-xs text-amber-500 mt-0.5">{expert ? 'Expertise' : 'Proficient'}</span>
      )}
    </div>
  );
}

registerWidget({
  typeId: 'passive-perception',
  label: 'Passive Perception',
  icon: 'visibility',
  defaultConfig: {},
  defaultSpan: 1,
  component: PassivePerceptionWidget,
});
