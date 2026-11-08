import type { Character } from '../character/types';
import { abilityMod } from './index';

export type ArmorKind = 'light' | 'medium' | 'heavy' | 'shield';

export interface ItemArmor {
  kind: ArmorKind;
  /** Base AC for worn armor; the flat bonus (+2) for a shield. */
  ac: number;
  /** DEX contribution cap for worn armor (light = unlimited, medium = 2, heavy = 0). Ignored for shields. */
  dexCap?: number;
  /** Magic AC bonus of this armor/shield (`bonusAc`, e.g. +1 Plate). */
  bonus?: number;
}

/** Raw fields an item record carries for AC purposes (5etools `baseitem`/`item`). */
interface RawArmorItem {
  type?: unknown;
  ac?: unknown;
  dexterityMax?: unknown;
  bonusAc?: unknown;
}

/** Parses a `bonusAc` value ("+1" or 1) — 0 when absent. */
export function itemAcBonus(item: object): number {
  const v = (item as { bonusAc?: unknown }).bonusAc;
  if (typeof v === 'number') return v;
  const n = typeof v === 'string' ? Number(v.replace(/\s/g, '')) : 0;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Interprets an item's armor data, or null if it isn't armor/a shield. `type` may carry a
 * source suffix ("LA|XPHB") — only the leading code matters. Medium/heavy DEX caps default to
 * the PHB values (2 / 0) when the item doesn't state `dexterityMax`.
 */
export function parseItemArmor(item: RawArmorItem): ItemArmor | null {
  const code = typeof item.type === 'string' ? item.type.split('|')[0] : '';
  const ac = typeof item.ac === 'number' ? item.ac : 0;
  const dexMax = typeof item.dexterityMax === 'number' ? item.dexterityMax : undefined;
  const bonus = itemAcBonus(item) || undefined;
  switch (code) {
    case 'LA': return { kind: 'light', ac, dexCap: dexMax, bonus };
    case 'MA': return { kind: 'medium', ac, dexCap: dexMax ?? 2, bonus };
    case 'HA': return { kind: 'heavy', ac, dexCap: dexMax ?? 0, bonus };
    case 'S':  return { kind: 'shield', ac, bonus };
    default:   return null;
  }
}

function acOverride(character: Character): number | undefined {
  const widget = character.dashboard.widgets.find(w => w.type === 'combat-stats');
  return (widget?.config as { acOverride?: number } | undefined)?.acOverride;
}

/**
 * A character's armor class. A manual override (combat-stats widget) always wins. Otherwise:
 * worn armor gives `base + DEX` capped by armor kind (light = full, medium = +2, heavy = 0);
 * with no worn armor the character is unarmored — `10 + DEX`, upgraded by Barbarian
 * (10 + DEX + CON) or Monk (10 + DEX + WIS, only while not using a shield) Unarmored Defense.
 * A shield adds its flat bonus on top of either. `worn`/`shield` are the resolved equipped items
 * (see useCharacterAc); omit them for the plain unarmored/override value.
 */
export function armorClass(
  character: Character,
  worn?: ItemArmor | null,
  shield?: ItemArmor | null,
  /** AC bonus from other equipped items (Ring/Cloak of Protection, …). */
  otherBonus = 0,
): number {
  const override = acOverride(character);
  if (override != null) return override;

  const dex = abilityMod(character.abilityScores.dex);
  const hasShield = !!shield;

  let base: number;
  if (worn && worn.kind !== 'shield') {
    const dexPart = worn.dexCap === undefined ? dex : Math.min(dex, worn.dexCap);
    base = worn.ac + dexPart + (worn.bonus ?? 0);
  } else {
    base = 10 + dex;
    for (const cl of character.classes) {
      const name = cl.classRef.name.toLowerCase();
      if (name === 'barbarian') base = Math.max(base, 10 + dex + abilityMod(character.abilityScores.con));
      if (name === 'monk' && !hasShield) base = Math.max(base, 10 + dex + abilityMod(character.abilityScores.wis));
    }
  }

  return base + (shield ? shield.ac + (shield.bonus ?? 0) : 0) + otherBonus;
}
