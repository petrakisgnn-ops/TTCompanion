import type { Lobby, PlayerSnapshot } from '../../domain/session/types';

/**
 * The session-lobby backend, behind an interface so the Firebase implementation is a swap, not a
 * rewrite (same pattern as CharacterRepository). A mock in-memory impl backs local dev/UI work.
 */
export interface LobbyRepository {
  /** This device's stable id (anonymous Firebase uid, or a mock id). */
  uid(): string;

  /** DM creates a lobby; resolves with the unique 5-digit code. */
  createLobby(dmName: string): Promise<string>;

  /** Player joins by code; resolves false if the lobby doesn't exist or is closed. */
  joinLobby(code: string, player: { name: string; character?: PlayerSnapshot }): Promise<boolean>;

  /** Player pushes a fresh character snapshot to their slot (e.g. after taking damage), so the DM sees it live. */
  updatePlayer(code: string, character: PlayerSnapshot): Promise<void>;

  /** The current device leaves the lobby (removes its player entry). */
  leaveLobby(code: string): Promise<void>;

  /** DM closes and removes the lobby. */
  closeLobby(code: string): Promise<void>;

  /** Subscribe to live lobby state; `cb(null)` when the lobby is gone. Returns an unsubscribe fn. */
  subscribeLobby(code: string, cb: (lobby: Lobby | null) => void): () => void;
}
