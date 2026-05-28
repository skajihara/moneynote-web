import { useThemeStore } from '../themeStore';

beforeEach(() => {
  document.documentElement.classList.remove('dark');
  useThemeStore.setState({ isDark: false });
  try { localStorage.clear(); } catch {}
});

describe('themeStore', () => {
  describe('init', () => {
    it('sets isDark to true when html element has dark class', () => {
      document.documentElement.classList.add('dark');
      useThemeStore.getState().init();
      expect(useThemeStore.getState().isDark).toBe(true);
    });

    it('sets isDark to false when html element does not have dark class', () => {
      document.documentElement.classList.remove('dark');
      useThemeStore.getState().init();
      expect(useThemeStore.getState().isDark).toBe(false);
    });
  });

  describe('toggle', () => {
    it('toggles isDark from false to true', () => {
      useThemeStore.setState({ isDark: false });
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().isDark).toBe(true);
    });

    it('toggles isDark from true to false', () => {
      useThemeStore.setState({ isDark: true });
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().isDark).toBe(false);
    });

    it('adds dark class to html when toggled on', () => {
      useThemeStore.setState({ isDark: false });
      useThemeStore.getState().toggle();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from html when toggled off', () => {
      document.documentElement.classList.add('dark');
      useThemeStore.setState({ isDark: true });
      useThemeStore.getState().toggle();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('persists dark mode to localStorage', () => {
      useThemeStore.setState({ isDark: false });
      useThemeStore.getState().toggle();
      expect(localStorage.getItem('darkMode')).toBe('dark');
    });

    it('persists light mode to localStorage', () => {
      useThemeStore.setState({ isDark: true });
      useThemeStore.getState().toggle();
      expect(localStorage.getItem('darkMode')).toBe('light');
    });
  });
});
