import { apiClient, ApiClientError } from '../client';
import { useAuthStore } from '@/stores/authStore';

// fetch をモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

// window.location をモック
const mockLocationHref = jest.fn();
Object.defineProperty(window, 'location', {
  value: { set href(url: string) { mockLocationHref(url); } },
  writable: true,
});

beforeEach(() => {
  mockFetch.mockReset();
  mockLocationHref.mockReset();
  useAuthStore.setState({ userId: null, userName: null, accessToken: null, isAuthenticated: false });
});

describe('apiClient', () => {
  it('200 レスポンスで data を返す', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { accessToken: 'token' }, error: null }),
    });

    const result = await apiClient('/api/v1/auth/login', {
      method: 'POST',
      skipRefresh: true,
    });
    expect(result).toEqual({ data: { accessToken: 'token' }, error: null });
  });

  it('4xx レスポンスで ApiClientError をスローする', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'E400', message: 'バリデーションエラー' } }),
    });

    await expect(
      apiClient('/api/v1/auth/register', { method: 'POST', skipRefresh: true })
    ).rejects.toThrow(ApiClientError);
  });

  it('401 で skipRefresh=true の場合はリフレッシュせず ApiClientError をスローする', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'E401', message: '認証エラー' } }),
    });

    await expect(
      apiClient('/api/v1/test', { skipRefresh: true })
    ).rejects.toThrow(ApiClientError);
    // リフレッシュ呼び出しが起きていない（fetch は1回のみ）
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('401 でリフレッシュ成功後にリトライする', async () => {
    // 1回目: 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'E401', message: '認証エラー' } }),
    });
    // リフレッシュ: 200
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { accessToken: 'new-token' }, error: null }),
    });
    // リトライ: 200
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { value: 'ok' }, error: null }),
    });

    const result = await apiClient('/api/v1/test');
    expect(result).toEqual({ data: { value: 'ok' }, error: null });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe('new-token');
  });

  it('401 でリフレッシュ失敗した場合は /login へリダイレクトする', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'E401', message: '認証エラー' } }),
    });
    // リフレッシュ: 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { code: 'E401', message: 'リフレッシュ失敗' } }),
    });

    await expect(apiClient('/api/v1/test')).rejects.toThrow(ApiClientError);
    expect(mockLocationHref).toHaveBeenCalledWith('/login');
  });

  it('Authorization ヘッダーに accessToken を付与する', async () => {
    useAuthStore.setState({ accessToken: 'my-token', isAuthenticated: true, userId: 'u1', userName: 'u1' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: null, error: null }),
    });

    await apiClient('/api/v1/test', { skipRefresh: true });

    const calledHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(calledHeaders.get('Authorization')).toBe('Bearer my-token');
  });
});
