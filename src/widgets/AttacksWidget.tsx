import { useEffect, useState } from 'react';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import { db } from '../data/db';
import { abilityMod, proficiencyBonus, totalLevel } from '../domain/rules';
import { refKey } from '../domain/reference/types';
import type { StoredItem } from '../data/db';

interface AttackEntry {
  name: string;
  atkBonus: number;
  dmg: string;
  type: string;
}

function isFinesseOrRanged(item: StoredItem): boolean {
  const props = (item.property as string[] | undefined) ?? [];
  // F = finesse, A = ammunition (ranged)
  return props.includes('F') || props.includes('A') || props.includes('T'); // T = thrown
}

function AttacksWidget({ character }: WidgetProps) {
  const [attacks, setAttacks] = useState<AttackEntry[]>([]);

  const lvl = totalLevel(character.classes);
  const pb  = proficiencyBonus(lvl);
  const strMod = abilityMod(character.abilityScores.str);
  const dexMod = abilityMod(character.abilityScores.dex);

  useEffect(() => {
    const equipped = character.inventory.filter(i => i.equipped);
    if (equipped.length === 0) { setAttacks([]); return; }

    const keys = equipped.map(i => refKey(i.itemRef));
    db.items.bulkGet(keys).then(items => {
      const entries: AttackEntry[] = [];

      items.forEach(item => {
        if (!item) return;
        // Only weapons have weaponCategory
        if (!item.weaponCategory) return;

        const finesse = isFinesseOrRanged(item);
        // For finesse/ranged pick the better of STR/DEX; otherwise STR
        const baseMod = finesse ? Math.max(strMod, dexMod) : strMod;
        const atkBonus = baseMod + pb;

        const dmg1   = (item.dmg1   as string | undefined) ?? '—';
        const dmgType = (item.dmgType as string | undefined) ?? '';
        // Abbreviate damage type to 4 chars (slashing→slas, etc.)
        const shortType = dmgType.slice(0, 4);

        entries.push({
          name: item.name,
          atkBonus,
          dmg: baseMod !== 0 ? `${dmg1}${baseMod >= 0 ? '+' : ''}${baseMod}` : dmg1,
          type: shortType,
        });
      });

      setAttacks(entries);
    });
  }, [character.inventory, character.abilityScores, lvl]);

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
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
          <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 13, fontWeight: 700, color: '#d08c4a', width: 44, textAlign: 'center' }}>
            {a.atkBonus >= 0 ? `+${a.atkBonus}` : a.atkBonus}
          </span>
          <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 12, color: 'var(--color-muted)', width: 68, textAlign: 'right' }}>
            {a.dmg} {a.type}
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
