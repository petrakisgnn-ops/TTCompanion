import type { LobbyRepository } from './LobbyRepository';
import { FirebaseLobbyRepository } from './FirebaseLobbyRepository';
// import { MockLobbyRepository } from './MockLobbyRepository'; // single-device fallback for offline UI work

/**
 * The active lobby backend. Firebase Realtime Database (cross-device, real-time). Swap to
 * `new MockLobbyRepository()` to develop the UI offline on a single device.
 */
export const lobbyRepository: LobbyRepository = new FirebaseLobbyRepository();
