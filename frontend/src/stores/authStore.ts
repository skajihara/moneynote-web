import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_THEME_COLOR = '#4A90D9';

type AuthState = {
  userId: string | null;
  userName: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  themeColor: string;
};

type AuthActions = {
  login: (userId: string, userName: string, accessToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setThemeColor: (color: string) => void;
};

const initialState: AuthState = {
  userId: null,
  userName: null,
  accessToken: null,
  isAuthenticated: false,
  themeColor: DEFAULT_THEME_COLOR,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,
      login: (userId, userName, accessToken) => {
        // isLoggedIn cookie をセット（middleware でのルートガード用）
        if (typeof document !== 'undefined') {
          document.cookie = 'isLoggedIn=true; path=/; SameSite=Strict';
        }
        set({ userId, userName, accessToken, isAuthenticated: true });
      },
      logout: () => {
        // isLoggedIn cookie をクリア
        if (typeof document !== 'undefined') {
          document.cookie =
            'isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
        }
        set(initialState);
      },
      setAccessToken: (token) => {
        set({ accessToken: token });
      },
      setThemeColor: (color) => {
        set({ themeColor: color });
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--theme-color', color);
        }
      },
    }),
    {
      name: 'moneynote-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : ({} as Storage)
      ),
      // accessToken はメモリのみ。userId / userName / isAuthenticated / themeColor を永続化する
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        isAuthenticated: state.isAuthenticated,
        themeColor: state.themeColor,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // リロード後はトークンをリセット（メモリのみ保持のため）
          state.accessToken = null;
          // 永続化したテーマカラーを CSS 変数に反映する
          if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty(
              '--theme-color',
              state.themeColor || DEFAULT_THEME_COLOR
            );
          }
        }
      },
    }
  )
);
