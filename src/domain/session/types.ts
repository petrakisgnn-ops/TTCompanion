/** The lightweight character summary a player brings into a lobby (a snapshot, not a live ref). */
export interface PlayerSnapshot {
  name: string;
  race: string;
  /** e.g. "Rogue 5" or "Fighter 3 / Wizard 2". */
  classes: string;
  level: number;
  hp: { current: number; max: number };
  ac: number;
}

/** A player present in a lobby. */
export interface LobbyPlayer {
  /** The player's anonymous Firebase uid (or mock id). */
  uid: string;
  name: string;
  joinedAt: number;
  character?: PlayerSnapshot;
}

/** A live session lobby: one DM, a shared 5-digit code, and the players who've joined. */
export interface Lobby {
  code: string;
  dmUid: string;
  dmName: string;
  status: 'open' | 'closed';
  createdAt: number;
  players: LobbyPlayer[];
}

/** This device's role in the current session. */
export type SessionRole = 'dm' | 'player';
