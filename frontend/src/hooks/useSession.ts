/**
 * 화면 컴포넌트가 현재 로그인 세션과 로딩 상태를 읽는 공통 훅입니다.
 * 인증 가드·헤더·계정 화면이 authClient의 세션 상태를 같은 방식으로 소비합니다.
 * 세션 원본은 auth 어댑터에서 관리하고 이 훅은 UI용 접근만 제공합니다.
 */
import { authClient, clearAuthToken } from "@/lib/auth";

/**
 * Template-level session hook so agents no longer call authClient.useSession() everywhere.
 *
 * Contract:
 * - `user` is the current signed-in user, or null when signed out.
 * - `isPending` is used for loading UI.
 * - `isAuthenticated` is the single auth check used by AuthGate and business pages.
 * - `signOut()` signs out from Better Auth and clears the local Bearer token.
 */
export function useSession() {
  const session = authClient.useSession();

  const user = session.data?.user ?? null;
  const isPending = Boolean(session.isPending);
  const isAuthenticated = Boolean(user);

  async function signOut() {
    await authClient.signOut().catch(() => undefined);
    clearAuthToken();
    window.location.reload();
  }

  return {
    session: session.data ?? null,
    user,
    isPending,
    isAuthenticated,
    signOut
  };
}
