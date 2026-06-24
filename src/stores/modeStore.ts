import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModeStore {
  mode: 'player' | 'dm';
  toggle: () => void;
  set: (mode: 'player' | 'dm') => void;
}

export const useModeStore = create<ModeStore>()(
  persist(
    (setState) => ({
      mode: 'player',
      toggle: () => setState(s => ({ mode: s.mode === 'player' ? 'dm' : 'player' })),
      set: (mode) => setState({ mode }),
    }),
    { name: 'app-mode' },
  ),
);
