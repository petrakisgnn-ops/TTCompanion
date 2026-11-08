/**
 * Mechanical side-effects of class "choose one" features (see domain/reference/classFeatures).
 * Most options are purely descriptive; the few that change numbers the app tracks are listed
 * here, keyed by the option id's leading "name|class|classSource".
 */

export interface FeatureChoiceGrant {
  weapons?: string[];
  armor?: string[];
  /** Extra cantrips known for that class. */
  cantrips?: number;
}

const GRANTS: Record<string, FeatureChoiceGrant> = {
  'protector|cleric|xphb': { weapons: ['Martial weapons'], armor: ['Heavy armor'] },
  'thaumaturge|cleric|xphb': { cantrips: 1 },
  'warden|druid|xphb': { weapons: ['Martial weapons'], armor: ['Medium armor'] },
  'magician|druid|xphb': { cantrips: 1 },
};

const grantKey = (optionId: string) => optionId.toLowerCase().split('|').slice(0, 3).join('|');

/** The grant of one chosen option, or an empty grant. */
export function grantForOption(optionId: string): FeatureChoiceGrant {
  return GRANTS[grantKey(optionId)] ?? {};
}

export interface FeatureChoiceTotals {
  weapons: string[];
  armor: string[];
  /** Extra cantrips by class name (lowercase). */
  cantripsByClass: Record<string, number>;
}

/** Sums the grants of every chosen option. */
export function featureChoiceTotals(choices: Record<string, string[]> | undefined): FeatureChoiceTotals {
  const totals: FeatureChoiceTotals = { weapons: [], armor: [], cantripsByClass: {} };
  for (const ids of Object.values(choices ?? {})) {
    for (const id of ids) {
      const g = grantForOption(id);
      totals.weapons.push(...(g.weapons ?? []));
      totals.armor.push(...(g.armor ?? []));
      if (g.cantrips) {
        const cls = (id.split('|')[1] ?? '').toLowerCase();
        totals.cantripsByClass[cls] = (totals.cantripsByClass[cls] ?? 0) + g.cantrips;
      }
    }
  }
  totals.weapons = [...new Set(totals.weapons)];
  totals.armor = [...new Set(totals.armor)];
  return totals;
}

/** Extra cantrips a class gets from its feature choices (Thaumaturge, Magician). */
export function bonusCantrips(choices: Record<string, string[]> | undefined, className: string): number {
  return featureChoiceTotals(choices).cantripsByClass[className.toLowerCase()] ?? 0;
}

/**
 * Applies a choice change to a proficiency list: removes what the previous options granted
 * (unless something else still grants it — `keep`) and adds what the new options grant.
 */
export function reconcileGrantedProficiencies(
  current: string[],
  removedGrants: string[],
  addedGrants: string[],
  keep: string[],
): string[] {
  const keepSet = new Set(keep.map(s => s.toLowerCase()));
  const addSet = new Set(addedGrants.map(s => s.toLowerCase()));
  const stripped = current.filter(p => {
    const k = p.toLowerCase();
    return !(removedGrants.some(r => r.toLowerCase() === k) && !keepSet.has(k) && !addSet.has(k));
  });
  const have = new Set(stripped.map(s => s.toLowerCase()));
  return [...stripped, ...addedGrants.filter(a => !have.has(a.toLowerCase()))];
}
