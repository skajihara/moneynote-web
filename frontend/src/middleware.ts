import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 認証不要なパス（前方一致）
 */
const PUBLIC_PATHS = ['/', '/login', '/register', '/password-reset', '/account-deletion/cancel', '/email-change/confirm'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // isLoggedIn cookie の有無でログイン状態を判定
  // （accessToken はメモリのみ保持のため、Cookie で代替する）
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストにマッチ:
     * - _next/static（静的ファイル）
     * - _next/image（画像最適化）
     * - favicon.ico
     * - public/ 配下のファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
