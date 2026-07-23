import type { RefId } from '../reference/types';
import type { DashboardLayout } from '../widgets/types';
import type { Edition } from '../rules/edition';

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

export interface Personality {
  trait: string;
  ideal: string;
  bond: string;
  flaw: string;
}

export interface Appearance {
  age: string;
  height: string;
  weight: string;
  eyes: string;
  skin: string;
  hair: string;
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
  /** The rules edition this character follows — set at creation, sticky thereafter. Older saved
   * characters (created before edition support) are normalized to '5e' on load. */
  edition: Edition;
  classes: ClassLevel[];
  race: RefId;
  subrace?: RefId | null;
  background: RefId;
  alignment: string | null;
  personality: Personality;
  appearance: Appearance;
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
    /** Skills with Expertise (Rogue/Bard) — proficiency bonus is doubled. Subset of `skills`. */
    expertise: string[];
  };
  knownSpells: KnownSpellRef[];
  preparedSpells: RefId[];
  /** Chosen class options — fighting styles, invocations, metamagic, maneuvers, ... (entries in optionalfeatures.json). */
  optionalFeatures: RefId[];
  /** Weapons whose Mastery property the character can use (2024 martials — see weaponMasteryCount). */
  masteredWeapons: RefId[];
  inventory: InventoryItem[];
  feats: RefId[];
  resources: ResourceTrack[];
  currency: Currency;
  dashboard: DashboardLayout;
  notes: string;
}
