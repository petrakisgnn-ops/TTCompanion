/** Selectable UI themes. Each maps to a CSS class on <html> that overrides the --color-* variables
 * (see src/index.css); the default dark theme uses no class. */
export type ThemeId = 'dark' | 'light' | 'parchment' | 'arcane' | 'treasure' | 'emerald' | 'dungeon' | 'heraldry';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** Drives `color-scheme` (native form controls / scrollbars). */
  isDark: boolean;
  /** Class applied to <html>; null for the default dark theme. */
  className: string | null;
  /** [background, surface, accent] preview swatch for the settings picker. */
  swatch: [string, string, string];
}

export const THEMES: readonly ThemeDef[] = [
  { id: 'dark',      label: 'Dark',           isDark: true,  className: null,              swatch: ['#16181d', '#161b22', '#d08c4a'] },
  { id: 'light',     label: 'Light',          isDark: false, className: 'light',           swatch: ['#f0f3f7', '#ffffff', '#b87333'] },
  { id: 'parchment', label: 'Aged Parchment', isDark: false, className: 'theme-parchment', swatch: ['#f2e8c9', '#fff9ed', '#c8a24a'] },
  { id: 'arcane',    label: 'Arcane',         isDark: true,  className: 'theme-arcane',    swatch: ['#101521', '#1d2538', '#5fa8ff'] },
  { id: 'treasure',  label: 'Treasure',       isDark: true,  className: 'theme-treasure',  swatch: ['#1c1613', '#2b241e', '#d4af37'] },
  { id: 'emerald',   label: 'Emerald',        isDark: true,  className: 'theme-emerald',   swatch: ['#13221b', '#20372a', '#3ba66b'] },
  { id: 'dungeon',   label: 'Dungeon',        isDark: true,  className: 'theme-dungeon',   swatch: ['#161616', '#252525', '#f4a261'] },
  { id: 'heraldry',  label: 'Heraldry',       isDark: false, className: 'theme-heraldry',  swatch: ['#f6f2ea', '#ffffff', '#d8b24c'] },
];

/** Every theme class (for clearing before applying the current one). */
export const THEME_CLASSES: readonly string[] = THEMES.map(t => t.className).filter((c): c is string => c !== null);

export const getTheme = (id: ThemeId): ThemeDef => THEMES.find(t => t.id === id) ?? THEMES[0];
