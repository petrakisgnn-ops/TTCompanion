import type { AbilityScores } from '../character/types';
import { abilityMod } from './index';

/** The item fields an attack line needs (5etools `item`/`baseitem`, or a converted custom item). */
export interface WeaponLike {
  name: string;
  type?: unknown;
  weaponCategory?: unknown;
  weapon?: unknown;
  property?: unknown;
  dmg1?: unknown;
  dmgType?: unknown;
  bonusWeapon?: unknown;
  bonusWeaponAttack?: unknown;
  bonusWeaponDamage?: unknown;
  extraDamage?: unknown;
}

export interface WeaponAttack {
  name: string;
  attackBonus: number;
  /** e.g. "1d6+4" */
  damage: string;
  /** Damage type label, e.g. "bludgeoning" (empty when unknown). */
  damageType: string;
  /** Extra on-hit damage, e.g. "1d6 radiant". */
  extraDamage?: string;
}

const DAMAGE_TYPES: Record<string, string> = {
  B: 'bludgeoning', P: 'piercing', S: 'slashing', A: 'acid', C: 'cold', F: 'fire', O: 'force',
  L: 'lightning', N: 'necrotic', I: 'poison', Y: 'psychic', R: 'radiant', T: 'thunder',
};

/** "+1" / 1 / "-2" → number; anything else → 0. */
export function parseBonus(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const code = (v: unknown) => (typeof v === 'string' ? v.split('|')[0] : '');

export function isWeapon(item: WeaponLike): boolean {
  const t = code(item.type);
  return !!item.weaponCategory || item.weapon === true || t === 'M' || t === 'R';
}

/**
 * One attack line for a weapon: ranged weapons use DEX, finesse the better of STR/DEX,
 * everything else STR; adds proficiency and the item's magic bonuses (`bonusWeapon` to both
 * rolls, `bonusWeaponAttack` / `bonusWeaponDamage` to one each). Null for non-weapons.
 */
export function weaponAttack(item: WeaponLike, scores: AbilityScores, proficiencyBonus: number): WeaponAttack | null {
  if (!isWeapon(item)) return null;
  const props = (Array.isArray(item.property) ? item.property : []).map(code);
  const str = abilityMod(scores.str);
  const dex = abilityMod(scores.dex);
  const mod = code(item.type) === 'R' ? dex : props.includes('F') ? Math.max(str, dex) : str;

  const magic = parseBonus(item.bonusWeapon);
  const attackBonus = mod + proficiencyBonus + magic + parseBonus(item.bonusWeaponAttack);
  const dmgBonus = mod + magic + parseBonus(item.bonusWeaponDamage);

  const dice = typeof item.dmg1 === 'string' && item.dmg1 ? item.dmg1 : '1';
  const damage = dmgBonus === 0 ? dice : `${dice}${dmgBonus > 0 ? '+' : ''}${dmgBonus}`;
  const rawType = typeof item.dmgType === 'string' ? item.dmgType : '';
  const damageType = DAMAGE_TYPES[rawType] ?? rawType.toLowerCase();

  return {
    name: item.name,
    attackBonus,
    damage,
    damageType,
    ...(typeof item.extraDamage === 'string' && item.extraDamage ? { extraDamage: item.extraDamage } : {}),
  };
}
