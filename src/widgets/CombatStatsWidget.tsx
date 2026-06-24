import { abilityMod, proficiencyBonus, totalLevel } from '../domain/rules';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

// Config lets the player override AC (e.g. when wearing armor).
export interface CombatStatsConfig {
  acOverride?: number;
  speedFt?: number;
}

function CombatStatsWidget({ instance, character }: WidgetProps) {
  const config = instance.config as CombatStatsConfig;
  const mods = {
    dex: abilityMod(character.abilityScores.dex),
  };
  const level = totalLevel(character.classes);
  const pb = proficiencyBonus(level);
  const ac = config.acOverride ?? (10 + mods.dex);
  const initiative = mods.dex;
  const speed = config.speedFt ?? 30;

  const stats = [
    { label: 'AC',         value: String(ac) },
    { label: 'Initiative', value: initiative >= 0 ? `+${initiative}` : String(initiative) },
    { label: 'Speed',      value: `${speed} ft` },
    { label: 'Prof Bonus', value: `+${pb}` },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 p-3">
      {stats.map(s => (
        <div key={s.label} className="bg-slate-700/50 rounded-xl flex flex-col items-center py-2.5 gap-0.5">
          <span className="text-lg font-bold leading-none">{s.value}</span>
          <span className="text-xs text-slate-500 text-center leading-tight mt-1">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

registerWidget({
  typeId: 'combat-stats',
  label: 'Combat Stats',
  icon: 'shield',
  defaultConfig: {} satisfies CombatStatsConfig,
  defaultSpan: 2,
  hasConfig: true,
  component: CombatStatsWidget,
});
