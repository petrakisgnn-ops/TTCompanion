import type { RefId } from '../reference/types';
import type { DashboardLayout } from '../widgets/types';

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface ClassLevel {
  classRef: RefId;
  subclass?: RefId;
  level: number;
}

export interface ResourceTrack {
  id: string;
  label: string;
  current: number;
  max: number;
  resetOn: 'shortRest' | 'longRest' | 'dawn' | 'manual';
}

export interface InventoryItem {
  itemRef: RefId;
  quantity: number;
  equipped: boolean;
}

export interface Currency {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

export interface KnownSpellRef extends RefId {
  /**
   * Set when this entry was gained via a race/background/feat grant rather than
   * learned normally (holds the granting item's name, e.g. "Strixhaven Initiate").
   * Kept as a distinct entry from a "normal" copy of the same spell — they follow
   * different rules (e.g. castable once per long rest without a slot, vs prepared
   * and cast using the character's own spell slots), so a character can genuinely
   * have both at once.
   */
  grantedBy?: string;
}

export interface Character {
  id: string;
  name: string;
  classes: ClassLevel[];
  race: RefId;
  subrace?: RefId | null;
  background: RefId;
  abilityScores: AbilityScores;
  hp: { max: number; current: number; temp: number };
  hitDiceSpent: number;
  deathSaves: { successes: number; failures: number };
  concentration: RefId | null;
  conditions: string[];
  proficiencies: {
    skills: string[];
    saves: string[];
    weapons: string[];
    armor: string[];
    tools: string[];
    languages: string[];
  };
  knownSpells: KnownSpellRef[];
  preparedSpells: RefId[];
  inventory: InventoryItem[];
  feats: RefId[];
  resources: ResourceTrack[];
  currency: Currency;
  dashboard: DashboardLayout;
  notes: string;
}
