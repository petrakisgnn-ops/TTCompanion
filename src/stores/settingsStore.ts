import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Edition = '5e' | '5.5e';
export type Theme   = 'dark' | 'light';

interface SettingsStore {
  edition: Edition;
  setEdition: (e: Edition) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      edition: '5e',
      setEdition: edition => set({ edition }),
      theme: 'dark',
      setTheme: theme => set({ theme }),
    }),
    { name: 'app-settings' },
  ),
);
