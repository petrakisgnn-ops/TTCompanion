import { describe, expect, it } from 'vitest';
import { weaponAttack } from './attacks';
import { customItemToItem, blankCustomItem } from '../character/customItems';
import type { Item } from '../reference/types';

const scores = { str: 16, dex: 14, con: 10, int: 10, wis: 10, cha: 10 }; // STR +3, DEX +2

const mace: Item = {
  name: 'Mace', source: 'XPHB', type: 'M|XPHB', weaponCategory: 'simple', dmg1: '1d6', dmgType: 'B', weapon: true,
  value: 500, entries: ['base text'],
};

describe('weaponAttack', () => {
  it('uses STR for a melee weapon', () => {
    expect(weaponAttack(mace, scores, 2)).toEqual({ name: 'Mace', attackBonus: 5, damage: '1d6+3', damageType: 'bludgeoning' });
  });
  it('uses the better ability for finesse (property codes may carry a source)', () => {
    const dagger = { name: 'Dagger', type: 'M|XPHB', weaponCategory: 'simple', property: ['F|XPHB', 'L|XPHB'], dmg1: '1d4', dmgType: 'P' };
    expect(weaponAttack(dagger, { ...scores, dex: 18 }, 2)?.attackBonus).toBe(6);
  });
  it('uses DEX for ranged', () => {
    expect(weaponAttack({ name: 'Shortbow', type: 'R', weaponCategory: 'simple', dmg1: '1d6' }, scores, 2)?.attackBonus).toBe(4);
  });
  it('adds magic weapon bonuses', () => {
    const a = weaponAttack({ ...mace, bonusWeapon: '+1' }, scores, 2)!;
    expect(a.attackBonus).toBe(6);
    expect(a.damage).toBe('1d6+4');
  });
  it('ignores non-weapons', () => {
    expect(weaponAttack({ name: 'Rope', type: 'G' }, scores, 2)).toBeNull();
  });
});

describe('custom items', () => {
  it('a custom mace inherits the base weapon and applies separate attack/damage bonuses', () => {
    const custom = { ...blankCustomItem('x'), name: 'Mace of Warning', baseItem: { name: 'Mace', source: 'XPHB' },
      attackBonus: 1, damageBonus: 2, extraDamage: '1d4 radiant', requiresAttunement: true, rarity: 'uncommon',
      description: 'Warns you.\n\nSecond paragraph.' };
    const item = customItemToItem(custom, mace);
    expect(item).toMatchObject({ name: 'Mace of Warning', source: 'Custom', dmg1: '1d6', reqAttune: true, baseItem: 'Mace|XPHB' });
    expect(item.value).toBeUndefined();
    expect(item.entries).toEqual(['Warns you.', 'Second paragraph.']);
    expect(weaponAttack(item, scores, 2)).toEqual({
      name: 'Mace of Warning', attackBonus: 6, damage: '1d6+5', damageType: 'bludgeoning', extraDamage: '1d4 radiant',
    });
  });
  it('a custom weapon without a base uses its own dice and type', () => {
    const item = customItemToItem({ ...blankCustomItem('y'), name: 'Sunblade', damageDice: '1d8', damageType: 'radiant', finesse: true });
    expect(weaponAttack(item, scores, 2)).toMatchObject({ attackBonus: 5, damage: '1d8+3', damageType: 'radiant' });
  });
});
