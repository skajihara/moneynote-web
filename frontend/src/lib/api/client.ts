import { useAuthStore } from '@/stores/authStore';

// nginx 同一ドメイン構成のため相対パスを使用する。
// SSR でのサーバーサイド API 呼び出しが必要な場合は NEXT_PUBLIC_API_URL に
// 内部 URL（http://backend:8080）を設定すること。
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// -------------------------
// エラー型
// -------------------------

export type ApiError = {
  code: string;
  message: string;
};

export class ApiClientError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
  }
}

// -------------------------
// オプション
// -------------------------

type ApiClientOptions = RequestInit & {
  /** 401 時のトークンリフレッシュをスキップする（認証エンドポイント用） */
  skipRefresh?: boolean;
};

// -------------------------
// 内部ヘルパー
// -------------------------

function buildHeaders(base: HeadersInit | undefined): Headers {
  const headers = new Headers(base);
  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function doFetch(url: string, options: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
    credentials: 'include',
  });
}

// -------------------------
// メイン関数
// -------------------------

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { skipRefresh, ...fetchOptions } = options;
  const url = `${BASE_URL}${path}`;

  let response = await doFetch(url, fetchOptions);

  // 401 → リフレッシュを試みる
  if (response.status === 401 && !skipRefresh) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshBody = await refreshRes.json();
        const newToken: string | undefined = refreshBody?.data?.accessToken;
        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken);
          // 元のリクエストをリトライ
          response = await doFetch(url, fetchOptions);
        }
      } else {
        // リフレッシュ失敗 → ログアウトしてログイン画面へ
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiClientError({ code: 'E401', message: '認証が切れました。再度ログインしてください。' });
      }
    } catch (e) {
      if (e instanceof ApiClientError) throw e;
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiClientError({ code: 'E401', message: '認証が切れました。再度ログインしてください。' });
    }
  }

  if (!response.ok) {
    let body: { error?: ApiError } = {};
    try {
      body = await response.json();
    } catch {
      // レスポンスボディが JSON でない場合は無視
    }
    throw new ApiClientError(
      body.error ?? { code: `E${response.status}`, message: response.statusText }
    );
  }

  // 204 No Content はボディが空なので json() を呼ばない
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
