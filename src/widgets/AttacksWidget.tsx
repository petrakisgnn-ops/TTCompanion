import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import { proficiencyBonus, totalLevel } from '../domain/rules';
import { weaponAttack, type WeaponAttack } from '../domain/rules/attacks';
import { useResolvedItems } from '../features/character/useResolvedItems';

function AttacksWidget({ character }: WidgetProps) {
  const pb = proficiencyBonus(totalLevel(character.classes));
  const equippedRefs = character.inventory.filter(i => i.equipped).map(i => i.itemRef);
  const resolved = useResolvedItems(equippedRefs, character.customItems);

  // Weapon math (ability, proficiency, magic bonuses) lives in domain/rules/attacks.
  const attacks: WeaponAttack[] = [...resolved.values()]
    .map(item => weaponAttack(item, character.abilityScores, pb))
    .filter((a): a is WeaponAttack => a !== null);

  if (attacks.length === 0) {
    return (
      <div style={{ padding: '10px 14px 14px', color: 'var(--color-faint)', fontSize: 12 }}>
        No weapons equipped.
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, padding: '0 2px' }}>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-faint)' }}>Weapon</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-faint)', width: 44, textAlign: 'center' }}>Atk</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-faint)', width: 68, textAlign: 'right' }}>Dmg</span>
      </div>
      {attacks.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-card-inner)', borderRadius: 10, padding: '9px 11px' }}>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
            {a.extraDamage && <span style={{ fontSize: 11, color: 'var(--color-faint)' }}>+ {a.extraDamage}</span>}
          </span>
          <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 13, fontWeight: 700, color: '#d08c4a', width: 44, textAlign: 'center' }}>
            {a.attackBonus >= 0 ? `+${a.attackBonus}` : a.attackBonus}
          </span>
          <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 12, color: 'var(--color-muted)', width: 68, textAlign: 'right' }}>
            {a.damage} {a.damageType.slice(0, 4)}
          </span>
        </div>
      ))}
    </div>
  );
}

registerWidget({
  typeId: 'attacks',
  label: 'Attacks',
  icon: 'swords',
  defaultConfig: {},
  defaultSpan: 2,
  component: AttacksWidget,
});
