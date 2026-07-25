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
  /** Per-lobby teardown for the `.info/connected` presence listener started in joinLobby. */
  private presence = new Map<string, () => void>();

  uid(): string { return auth.currentUser?.uid ?? ''; }

  private stopPresence(code: string): void {
    const off = this.presence.get(code);
    if (off) { off(); this.presence.delete(code); }
  }

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
    const entry: LobbyPlayer = { uid, name: player.name, joinedAt: Date.now(), online: true };
    if (player.character) entry.character = player.character;

    const playerRef = ref(db, `lobbies/${code}/players/${uid}`);

    // Presence that survives device sleep: instead of removing the player when the socket drops,
    // flag them offline (they stay in the lobby, shown as "away"), and re-assert full presence
    // every time the client reconnects. Without the reconnect step, the first drop (sleep) would
    // strand them offline forever; without keeping the entry, they'd vanish from the DM's roster.
    const assertPresence = async (): Promise<void> => {
      const cur = await get(ref(db, `lobbies/${code}`));
      const still = cur.val() as LobbyNode | null;
      if (!still || still.status !== 'open') return; // lobby closed while we were away — don't resurrect it
      await onDisconnect(playerRef).update({ online: false });
      await set(playerRef, entry);
    };

    await assertPresence(); // appear immediately
    this.stopPresence(code); // guard against a re-join without an explicit leave
    const off = onValue(ref(db, '.info/connected'), snap => {
      if (snap.val() === true) void assertPresence();
    });
    this.presence.set(code, off);
    return true;
  }

  async updatePlayer(code: string, character: PlayerSnapshot): Promise<void> {
    const uid = await ensureAuth();
    await set(ref(db, `lobbies/${code}/players/${uid}/character`), character);
  }

  async leaveLobby(code: string): Promise<void> {
    const uid = await ensureAuth();
    this.stopPresence(code);
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
