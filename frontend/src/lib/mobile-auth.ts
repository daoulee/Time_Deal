/**
 * 모바일 팀 Supabase 프로젝트 전용 세션을 저장합니다. 우리 웹 로그인(auth.ts)과는 별개입니다.
 */
import { mobileSignIn, mobileSignUp } from "@/lib/api";

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

/**
 * 웹 계정 로그인/회원가입 직후, 같은 이메일·비밀번호로 모바일 팀 Supabase 계정도
 * 함께 로그인(없으면 자동 가입)해서 "동네 딜" 예약·찜이 모바일 앱과 계정 하나로 이어지게 합니다.
 * 실패해도(비밀번호가 서로 다르거나 이메일 인증 대기 중 등) 웹 로그인 자체는 절대 막지 않는
 * best-effort 연동이라, 호출부는 결과를 기다리지 않고 void로 실행합니다.
 */
export async function linkMobileAccount(email: string, password: string): Promise<boolean> {
  try {
    const signInResult = await mobileSignIn(email, password, true);
    if (signInResult.ok && signInResult.data) {
      setMobileSession(signInResult.data.accessToken, signInResult.data.refreshToken, signInResult.data.user);
      return true;
    }
    const signUpResult = await mobileSignUp(email, password, true);
    if (signUpResult.ok && signUpResult.data?.accessToken && signUpResult.data.refreshToken) {
      setMobileSession(signUpResult.data.accessToken, signUpResult.data.refreshToken, signUpResult.data.user);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
