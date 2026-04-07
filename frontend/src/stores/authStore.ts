import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type AuthState = {
  userId: string | null;
  userName: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
};

type AuthActions = {
  login: (userId: string, userName: string, accessToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
};

const initialState: AuthState = {
  userId: null,
  userName: null,
  accessToken: null,
  isAuthenticated: false,
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
    }),
    {
      name: 'moneynote-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : ({} as Storage)
      ),
      // accessToken はメモリのみ。userId / userName / isAuthenticated だけ永続化する
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // リロード後はトークンを必ずリセット（メモリのみ保持のため）
        if (state) {
          state.accessToken = null;
        }
      },
    }
  )
);
