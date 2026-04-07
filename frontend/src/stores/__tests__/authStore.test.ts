import { act } from 'react';
import { useAuthStore } from '../authStore';

// sessionStorage をモック
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

beforeEach(() => {
  useAuthStore.setState({
    userId: null,
    userName: null,
    accessToken: null,
    isAuthenticated: false,
  });
  sessionStorageMock.clear();
});

describe('authStore', () => {
  it('login で認証状態がセットされる', () => {
    act(() => {
      useAuthStore.getState().login('user1', 'ユーザー1', 'token-abc');
    });
    const state = useAuthStore.getState();
    expect(state.userId).toBe('user1');
    expect(state.userName).toBe('ユーザー1');
    expect(state.accessToken).toBe('token-abc');
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout で認証状態がクリアされる', () => {
    act(() => {
      useAuthStore.getState().login('user1', 'ユーザー1', 'token-abc');
      useAuthStore.getState().logout();
    });
    const state = useAuthStore.getState();
    expect(state.userId).toBeNull();
    expect(state.userName).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setAccessToken でトークンのみ更新される', () => {
    act(() => {
      useAuthStore.getState().login('user1', 'ユーザー1', 'old-token');
      useAuthStore.getState().setAccessToken('new-token');
    });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-token');
    expect(state.userId).toBe('user1');
    expect(state.isAuthenticated).toBe(true);
  });
});
