import { ref, get, set, remove, onValue, runTransaction, onDisconnect, serverTimestamp } from 'firebase/database';
import { db, auth, ensureAuth } from '../firebase';
import type { Lobby, LobbyPlayer, PlayerSnapshot } from '../../domain/session/types';
import type { LobbyRepository } from './LobbyRepository';

// Shape stored at lobbies/{code}: players is a uid-keyed object (RTDB has no arrays).
interface LobbyNode {
  dmUid: string;
  dmName: string;
  status: 'open' | 'closed';
  createdAt: number;
  players?: Record<string, LobbyPlayer>;
}

function toLobby(code: string, val: LobbyNode | null): Lobby | null {
  if (!val) return null;
  return {
    code,
    dmUid: val.dmUid,
    dmName: val.dmName,
    status: val.status,
    createdAt: val.createdAt ?? 0,
    players: val.players ? Object.values(val.players) : [],
  };
}

const randomCode = (): string => String(Math.floor(10000 + Math.random() * 90000));

export class FirebaseLobbyRepository implements LobbyRepository {
  uid(): string { return auth.currentUser?.uid ?? ''; }

  async createLobby(dmName: string): Promise<string> {
    const uid = await ensureAuth();
    // Claim a free 5-digit code with a transaction so two DMs can't grab the same one.
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = randomCode();
      const result = await runTransaction(ref(db, `lobbies/${code}`), current => {
        if (current !== null) return; // taken — abort, try another code
        return { dmUid: uid, dmName, status: 'open', createdAt: serverTimestamp() };
      });
      if (result.committed) return code;
    }
    throw new Error('Could not allocate a lobby code');
  }

  async joinLobby(code: string, player: { name: string; character?: PlayerSnapshot }): Promise<boolean> {
    const uid = await ensureAuth();
    const snap = await get(ref(db, `lobbies/${code}`));
    const node = snap.val() as LobbyNode | null;
    if (!node || node.status !== 'open') return false;

    // RTDB rejects `undefined`, so only include character when the player brought one.
    const entry: LobbyPlayer = { uid, name: player.name, joinedAt: Date.now() };
    if (player.character) entry.character = player.character;

    const playerRef = ref(db, `lobbies/${code}/players/${uid}`);
    await set(playerRef, entry);
    // Auto-remove this player if the tab closes / device drops.
    onDisconnect(playerRef).remove();
    return true;
  }

  async leaveLobby(code: string): Promise<void> {
    const uid = await ensureAuth();
    const playerRef = ref(db, `lobbies/${code}/players/${uid}`);
    await onDisconnect(playerRef).cancel();
    await remove(playerRef);
  }

  async closeLobby(code: string): Promise<void> {
    await ensureAuth();
    await remove(ref(db, `lobbies/${code}`));
  }

  subscribeLobby(code: string, cb: (lobby: Lobby | null) => void): () => void {
    const lobbyRef = ref(db, `lobbies/${code}`);
    const off = onValue(lobbyRef, snap => cb(toLobby(code, snap.val() as LobbyNode | null)));
    return off;
  }
}
