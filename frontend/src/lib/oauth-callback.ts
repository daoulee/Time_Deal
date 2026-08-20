/**
 * Supabase OAuth redirect 결과를 안전하게 처리하는 프론트 인증 모듈입니다.
 * PKCE의 `?code=...`는 supabase-js의 exchangeCodeForSession으로 교환하고,
 * implicit/hash 방식의 `#access_token=...`은 supabase-js가 감지한 세션을 읽습니다.
 * URL에서 OAuth 민감 파라미터를 제거한 뒤에만 Render 세션 교환을 요청합니다.
 */
import { apiFetch } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";
import { supabaseAuthClient } from "@/lib/supabase-auth";

function hasOAuthError(url: URL) {
  return Boolean(url.searchParams.get("error") || url.searchParams.get("error_code") || url.hash.match(/(?:^|&)error(?:=|&|$)/));
}

function hasPkceCode(url: URL) {
  return Boolean(url.searchParams.get("code"));
}

function hasImplicitAccessToken(url: URL) {
  return Boolean(new URLSearchParams(url.hash.replace(/^#/, "")).get("access_token"));
}

function cleanOAuthUrl(url: URL) {
  const clean = new URL(url.origin + url.pathname);
  clean.search = url.search;
  clean.hash = "";
  ["code", "error", "error_code", "error_description", "error_uri", "provider_token", "provider_refresh_token", "access_token", "refresh_token", "expires_at", "expires_in", "token_type", "type"].forEach((key) => clean.searchParams.delete(key));
  return `${clean.pathname}${clean.search}${clean.hash}`;
}

export type OAuthCallbackResult =
  | { status: "not-oauth" }
  | { status: "error"; message: string }
  | { status: "success" }
  | { status: "exchange-failed"; message: string };

export async function handleSupabaseOAuthCallback(): Promise<OAuthCallbackResult> {
  if (!supabaseAuthClient || typeof window === "undefined") return { status: "not-oauth" };
  const currentUrl = new URL(window.location.href);
  const isCallback = hasOAuthError(currentUrl) || hasPkceCode(currentUrl) || hasImplicitAccessToken(currentUrl);
  if (!isCallback) return { status: "not-oauth" };

  if (hasOAuthError(currentUrl)) {
    const message = currentUrl.searchParams.get("error_description") || "소셜 로그인에 실패했습니다.";
    window.history.replaceState(window.history.state, "", cleanOAuthUrl(currentUrl));
    return { status: "error", message };
  }

  if (hasPkceCode(currentUrl)) {
    const { error } = await supabaseAuthClient.auth.exchangeCodeForSession(currentUrl.searchParams.get("code") ?? "");
    if (error) {
      window.history.replaceState(window.history.state, "", cleanOAuthUrl(currentUrl));
      return { status: "error", message: error.message || "OAuth 인증 코드를 처리하지 못했습니다." };
    }
  }

  const { data, error } = await supabaseAuthClient.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    window.history.replaceState(window.history.state, "", cleanOAuthUrl(currentUrl));
    return { status: "error", message: error?.message || "OAuth 세션을 확인하지 못했습니다." };
  }

  const response = await apiFetch("/auth/supabase-session/exchange", {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  }).catch(() => null);

  if (!response?.ok) {
    window.history.replaceState(window.history.state, "", cleanOAuthUrl(currentUrl));
    return { status: "exchange-failed", message: "로그인 세션 연결에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 서버 검증 성공 후에만 기존 Render 인증 토큰을 저장합니다.
  setAuthToken(accessToken);
  window.history.replaceState(window.history.state, "", cleanOAuthUrl(currentUrl));
  return { status: "success" };
}
