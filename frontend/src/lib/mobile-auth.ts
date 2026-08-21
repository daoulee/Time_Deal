/**
 * 모바일 팀 Supabase 프로젝트 전용 세션을 저장합니다. 우리 웹 로그인(auth.ts)과는 별개입니다.
 */
const ACCESS_KEY = "td_mobile_access_token";
const REFRESH_KEY = "td_mobile_refresh_token";
const USER_KEY = "td_mobile_user";

export type MobileSessionUser = { id: string; email: string };

export function getMobileSession(): { accessToken: string; refreshToken: string; user: MobileSessionUser } | null {
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!accessToken || !refreshToken || !userRaw) return null;
  try { return { accessToken, refreshToken, user: JSON.parse(userRaw) as MobileSessionUser }; } catch { return null; }
}
export function setMobileSession(accessToken: string, refreshToken: string, user: MobileSessionUser) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearMobileSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
