/**
 * 브라우저에서 Supabase Auth의 이메일 OTP와 Kakao OAuth를 호출하는 유틸리티입니다.
 * 이 파일은 anon/public key만 사용하며 service role key를 절대 참조하지 않습니다.
 * 기존 Render 인증 어댑터와 충돌하지 않도록 Supabase 세션을 현재 API 세션으로
 * 세션 교환은 백엔드의 검증 엔드포인트를 통해서만 수행하며, 토큰을 URL이나 로그에 남기지 않습니다.
 */
import { createClient, type AuthResponse, type Session } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

export const isSupabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseAuthClient = isSupabaseAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function sendEmailOtp(email: string, redirectTo = `${window.location.origin}/auth`) {
  if (!supabaseAuthClient) throw new Error("프론트 Supabase Auth 환경변수를 설정하세요.");
  return supabaseAuthClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
}

export async function verifyEmailOtp(email: string, token: string) {
  if (!supabaseAuthClient) throw new Error("프론트 Supabase Auth 환경변수를 설정하세요.");
  return supabaseAuthClient.auth.verifyOtp({ email, token, type: "email" });
}

export async function startKakaoAuth(redirectTo = `${window.location.origin}/auth`) {
  if (!supabaseAuthClient) throw new Error("프론트 Supabase Auth 환경변수를 설정하세요.");
  return supabaseAuthClient.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo },
  });
}

export async function getSupabaseAuthSession(): Promise<Session | null> {
  if (!supabaseAuthClient) return null;
  const { data } = await supabaseAuthClient.auth.getSession();
  return data.session;
}

export type SupabaseAuthResult = AuthResponse;
