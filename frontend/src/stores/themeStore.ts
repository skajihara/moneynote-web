import { create } from 'zustand';

type ThemeStore = {
  isDark: boolean;
  init: () => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  isDark: false,
  init: () => {
    const dark = document.documentElement.classList.contains('dark');
    set({ isDark: dark });
  },
  toggle: () => {
    const next = !get().isDark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('darkMode', next ? 'dark' : 'light'); } catch {}
    set({ isDark: next });
  },
}));
