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

export interface Character {
  id: string;
  name: string;
  classes: ClassLevel[];
  race: RefId;
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
  knownSpells: RefId[];
  preparedSpells: RefId[];
  inventory: InventoryItem[];
  feats: RefId[];
  resources: ResourceTrack[];
  currency: Currency;
  dashboard: DashboardLayout;
  notes: string;
}
