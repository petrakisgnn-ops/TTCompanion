import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Edition } from '../domain/rules/edition';
import type { ThemeId } from '../app/themes';

export type { Edition };
export type Theme = ThemeId;

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
