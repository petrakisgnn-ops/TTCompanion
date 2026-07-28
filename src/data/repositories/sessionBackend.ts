import type { LobbyRepository } from './LobbyRepository';
import { FirebaseLobbyRepository } from './FirebaseLobbyRepository';
// import { MockLobbyRepository } from './MockLobbyRepository'; // single-device fallback for offline UI work

/**
 * The active lobby backend. Firebase Realtime Database (cross-device, real-time). Swap to
 * `new MockLobbyRepository()` to develop the UI offline on a single device.
 */
export const lobbyRepository: LobbyRepository = new FirebaseLobbyRepository();

/**
 * Multiplayer kill switch. While false, the Session screen refuses to create or join a lobby, so the
 * app never calls Firebase (nothing else reaches the network until a lobby exists). Flip back to
 * true once `database.rules.json` enforces validation and size caps on `lobbies/$code/players/$uid`.
 */
export const LOBBY_ENABLED = false;
