import type { Lobby, PlayerSnapshot } from '../../domain/session/types';
import type { LobbyRepository } from './LobbyRepository';

// Module-level in-memory state so create + join + subscribe all share one "server" within a session.
// Single-device only (no cross-device sync) — enough to build and exercise the UI before Firebase.
const lobbies = new Map<string, Lobby>();
const subscribers = new Map<string, Set<(l: Lobby | null) => void>>();
const MY_UID = 'mock-' + Math.random().toString(36).slice(2, 10);

const clone = (l: Lobby): Lobby => structuredClone(l);

function emit(code: string): void {
  const l = lobbies.get(code) ?? null;
  subscribers.get(code)?.forEach(cb => cb(l ? clone(l) : null));
}

function randomCode(): string {
  let code: string;
  do { code = String(Math.floor(10000 + Math.random() * 90000)); } while (lobbies.has(code));
  return code;
}

export class MockLobbyRepository implements LobbyRepository {
  uid(): string { return MY_UID; }

  createLobby(dmName: string): Promise<string> {
    const code = randomCode();
    lobbies.set(code, { code, dmUid: MY_UID, dmName, status: 'open', createdAt: Date.now(), players: [] });
    emit(code);
    return Promise.resolve(code);
  }

  joinLobby(code: string, player: { name: string; character?: PlayerSnapshot }): Promise<boolean> {
    const l = lobbies.get(code);
    if (!l || l.status !== 'open') return Promise.resolve(false);
    if (!l.players.some(p => p.uid === MY_UID)) {
      l.players.push({ uid: MY_UID, name: player.name, joinedAt: Date.now(), character: player.character });
    }
    emit(code);
    return Promise.resolve(true);
  }

  updatePlayer(code: string, character: PlayerSnapshot): Promise<void> {
    const l = lobbies.get(code);
    const p = l?.players.find(pl => pl.uid === MY_UID);
    if (p) { p.character = character; emit(code); }
    return Promise.resolve();
  }

  leaveLobby(code: string): Promise<void> {
    const l = lobbies.get(code);
    if (l) { l.players = l.players.filter(p => p.uid !== MY_UID); emit(code); }
    return Promise.resolve();
  }

  closeLobby(code: string): Promise<void> {
    const l = lobbies.get(code);
    if (l) { l.status = 'closed'; emit(code); lobbies.delete(code); }
    return Promise.resolve();
  }

  subscribeLobby(code: string, cb: (lobby: Lobby | null) => void): () => void {
    let set = subscribers.get(code);
    if (!set) { set = new Set(); subscribers.set(code, set); }
    set.add(cb);
    const current = lobbies.get(code);
    cb(current ? clone(current) : null);
    return () => { subscribers.get(code)?.delete(cb); };
  }
}
