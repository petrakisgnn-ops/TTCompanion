import { create } from 'zustand';
import type { Lobby, PlayerSnapshot, SessionRole } from '../domain/session/types';
import { lobbyRepository } from '../data/repositories/sessionBackend';

interface SessionState {
  /** This device's stable id (to distinguish self in the player list). */
  myUid: string;
  /** Live lobby state, or null when not in a session. */
  lobby: Lobby | null;
  role: SessionRole | null;
  code: string | null;
  busy: boolean;
  error: string | null;

  createLobby: (dmName: string) => Promise<void>;
  joinLobby: (code: string, name: string, character?: PlayerSnapshot) => Promise<void>;
  /** Player leaves the current lobby. */
  leave: () => Promise<void>;
  /** DM closes the current lobby. */
  close: () => Promise<void>;
}

// One subscription at a time, held outside the store so it survives re-renders.
let unsub: (() => void) | null = null;

export const useSessionStore = create<SessionState>((set, get) => ({
  myUid: lobbyRepository.uid(),
  lobby: null,
  role: null,
  code: null,
  busy: false,
  error: null,

  createLobby: async (dmName) => {
    set({ busy: true, error: null });
    try {
      const code = await lobbyRepository.createLobby(dmName.trim() || 'Dungeon Master');
      unsub?.();
      unsub = lobbyRepository.subscribeLobby(code, lobby => set({ lobby }));
      set({ role: 'dm', code, busy: false });
    } catch {
      set({ busy: false, error: 'Could not create the lobby. Check your connection.' });
    }
  },

  joinLobby: async (code, name, character) => {
    set({ busy: true, error: null });
    try {
      const ok = await lobbyRepository.joinLobby(code, { name: name.trim() || 'Player', character });
      if (!ok) { set({ busy: false, error: 'No open lobby with that code.' }); return; }
      unsub?.();
      unsub = lobbyRepository.subscribeLobby(code, lobby => set({ lobby }));
      set({ role: 'player', code, busy: false });
    } catch {
      set({ busy: false, error: 'Could not join the lobby. Check the code and your connection.' });
    }
  },

  leave: async () => {
    const { code } = get();
    if (code) await lobbyRepository.leaveLobby(code);
    unsub?.(); unsub = null;
    set({ lobby: null, role: null, code: null, error: null });
  },

  close: async () => {
    const { code } = get();
    if (code) await lobbyRepository.closeLobby(code);
    unsub?.(); unsub = null;
    set({ lobby: null, role: null, code: null, error: null });
  },
}));
