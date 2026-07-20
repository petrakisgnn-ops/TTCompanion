import type { Entry } from '../reference/types';
import type { AbilityScores } from '../character/types';

export type Disposition = 'friendly' | 'neutral' | 'hostile';

/** Provenance link back to the bestiary entry an NPC was snapshotted from. */
export interface StatBlockSource {
  key: string;
  name: string;
}

export interface NpcStatBlock {
  ac: number;
  hp: { current: number; max: number };
  speed: string;
  abilityScores?: AbilityScores;
  saves?: string[];
  skills?: string[];
  senses?: string;
  languages?: string;
  cr?: string;
  traits?: Entry[];
  actions?: Entry[];
  reactions?: Entry[];
}

/** The DM-facing "Setting" — a named group of prepped NPCs (spec calls it EncounterGroup in code to avoid colliding with the app Settings tab). */
export interface EncounterGroup {
  id: string;
  name: string;
}

/** Built-in group id for NPCs not assigned to a Setting. Not a stored row. */
export const UNASSIGNED_GROUP_ID = 'unassigned';

/**
 * A prepped NPC definition (template). `count` is the quantity this definition
 * represents within its group — deploying expands it into lettered DeployedInstances
 * without mutating this definition.
 */
export interface NpcDefinition {
  id: string;
  name: string;
  race?: string;
  disposition: Disposition;
  description: string;
  notes: string;
  groupId: string;
  count: number;
  source: StatBlockSource | null;
  statBlock: NpcStatBlock | null;
}

export interface DeployedCondition {
  name: string;
  /** Round number at which this condition should be treated as expired, or null if it doesn't expire. */
  expiresEndOfRound: number | null;
}

/** A live, independent combat/scene instance of a deployed NPC. */
export interface DeployedInstance {
  id: string;
  npcDefId: string;
  instanceLabel: string;
  name: string;
  disposition: Disposition;
  hp: { current: number; max: number };
  ac: number;
  /** Snapshotted at deploy time from the source stat block, used only for initiative tiebreaks. */
  dexMod: number;
  conditions: DeployedCondition[];
  initiative: number | null;
  source: StatBlockSource | null;
}

export interface PcCombatMeta {
  initiative: number | null;
}

/** The DM's current session/table state — persisted, survives refresh. */
export interface SceneState {
  combatActive: boolean;
  round: number;
  turnOrder: string[];
  currentTurnId: string | null;
  deployed: DeployedInstance[];
  pcMeta: Record<string, PcCombatMeta>;
}

export const emptySceneState = (): SceneState => ({
  combatActive: false,
  round: 1,
  turnOrder: [],
  currentTurnId: null,
  deployed: [],
  pcMeta: {},
});

export interface SessionNote {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}
