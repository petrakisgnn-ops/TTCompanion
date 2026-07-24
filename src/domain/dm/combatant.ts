import type { Character } from '../character/types';
import { classSummary } from '../character/format';
import { abilityMod, characterAc, passiveScore, proficiencyBonus, totalLevel } from '../rules';
import type { LobbyPlayer } from '../session/types';
import type { DeployedInstance, Disposition, PcCombatMeta } from './types';

/**
 * The one shape the combat tracker/roster UI is allowed to depend on — never on
 * Character or DeployedInstance directly. A PC row is a read-only projection; an
 * NPC row is DM-editable. Built via the two adapters below.
 */
export interface CombatantView {
  id: string;
  kind: 'pc' | 'npc';
  name: string;
  subtitle: string;
  ac: number;
  hp: { current: number; max: number };
  passivePerception: number | null;
  conditions: string[];
  initiative: number | null;
  disposition: Disposition | null;
  editable: boolean;
  /** Snapshot dex mod, used only for the initiative tiebreak — not displayed. */
  dexMod: number;
}

export function pcToCombatant(character: Character, meta: PcCombatMeta | undefined): CombatantView {
  const level = totalLevel(character.classes);
  const pb = proficiencyBonus(level);
  const wisMod = abilityMod(character.abilityScores.wis);
  const proficient = character.proficiencies.skills.includes('Perception');

  return {
    id: character.id,
    kind: 'pc',
    name: character.name,
    subtitle: `${character.race.name} · ${classSummary(character.classes)}`,
    ac: characterAc(character),
    hp: { current: character.hp.current, max: character.hp.max },
    passivePerception: passiveScore(wisMod, pb, proficient, character.proficiencies.expertise?.includes('Perception') ?? false),
    conditions: character.conditions ?? [],
    initiative: meta?.initiative ?? null,
    disposition: null,
    editable: false,
    dexMod: abilityMod(character.abilityScores.dex),
  };
}

export function npcToCombatant(instance: DeployedInstance): CombatantView {
  return {
    id: instance.id,
    kind: 'npc',
    name: instance.name,
    subtitle: instance.source?.name ? `based on ${instance.source.name}` : '',
    ac: instance.ac,
    hp: instance.hp,
    passivePerception: null,
    conditions: instance.conditions.map(c => c.name),
    initiative: instance.initiative,
    disposition: instance.disposition,
    editable: true,
    dexMod: instance.dexMod,
  };
}

/**
 * A remote lobby player, projected into a roster row. Read-only: HP/AC are the snapshot the player
 * reported when joining (they don't live-update from the player's device yet). `id` is namespaced
 * with `lobby-` so it never collides with a local character id, and initiative reuses pcMeta.
 */
export function lobbyPlayerToCombatant(player: LobbyPlayer, meta: PcCombatMeta | undefined): CombatantView {
  const snap = player.character;
  return {
    id: `lobby-${player.uid}`,
    kind: 'pc',
    name: snap?.name ?? player.name,
    subtitle: snap ? `${snap.race} · ${snap.classes}` : 'Player (no character)',
    ac: snap?.ac ?? 10,
    hp: snap?.hp ?? { current: 0, max: 0 },
    passivePerception: null,
    conditions: [],
    initiative: meta?.initiative ?? null,
    disposition: null,
    editable: false,
    dexMod: 0,
  };
}

/** Initiative desc, dex mod desc tiebreak, name asc as a last resort. Used to seed combat order — the DM can drag to override afterward. */
export function sortByInitiative(views: CombatantView[]): CombatantView[] {
  return [...views].sort((a, b) =>
    (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) ||
    b.dexMod - a.dexMod ||
    a.name.localeCompare(b.name),
  );
}
