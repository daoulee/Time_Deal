/**
 * 기존 화면 인터페이스를 유지하며 Supabase 백엔드 인증 API에 연결하는 세션 어댑터입니다.
 * AuthPage와 라우트 가드가 로그인·가입·로그아웃·세션 갱신 결과를 소비합니다.
 * access token은 브라우저 저장소가 차단되면 메모리에만 보관합니다.
 */
import { useSyncExternalStore } from "react";
import { apiUrl } from "@/lib/api-base";
import { supabaseAuthClient } from "@/lib/supabase-auth";

const AUTH_TOKEN_KEY = "timedeal-access-token";
type AuthUser = { id: string; email: string; name?: string; emailVerified: boolean; role?: "user" | "seller" | "admin" };
type SessionData = { user: AuthUser } | null;
type AuthResult = { data?: { token?: string | null; user?: AuthUser } | null; error?: { message: string } | null };
let inMemoryToken = "";
let cachedSession: SessionData = null;
let pending = true;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
function readStoredToken() { try { return localStorage.getItem(AUTH_TOKEN_KEY) ?? ""; } catch { return ""; } }
export function getAuthToken() { return inMemoryToken || readStoredToken(); }
export function setAuthToken(token: string) { inMemoryToken = token; try { localStorage.setItem(AUTH_TOKEN_KEY, token); } catch { /* 저장소 차단 시 메모리 토큰만 사용합니다. */ } emit(); }
export function clearAuthToken() { inMemoryToken = ""; cachedSession = null; try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch { /* 저장소 차단 시 메모리 토큰만 초기화합니다. */ } emit(); }
export function syncAuthTokenFromResult(result: AuthResult | null) { const token = result?.data?.token || getAuthToken(); if (token) setAuthToken(token); return { token, user: result?.data?.user }; }
async function authRequest(path: string, body?: unknown): Promise<AuthResult> {
  const token = getAuthToken();
  const response = await fetch(apiUrl(`/auth${path}`), { method: body === undefined ? "GET" : "POST", headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => null) as { data?: { accessToken?: string | null; user?: AuthUser }; error?: { message?: string } } | null;
  if (!response.ok) return { error: { message: payload?.error?.message ?? "인증 요청에 실패했습니다." } };
  const accessToken = payload?.data?.accessToken ?? null;
  if (accessToken) setAuthToken(accessToken);
  if (payload?.data?.user && (accessToken || path === "/session")) { cachedSession = { user: payload.data.user }; emit(); }
  return { data: { token: accessToken, user: payload?.data?.user }, error: null };
}
async function refreshSession() {
  const token = getAuthToken();
  if (!token) { cachedSession = null; pending = false; emit(); return; }
  const result = await authRequest("/session");
  cachedSession = result.error || !result.data?.user ? null : { user: result.data.user };
  if (!cachedSession) clearAuthToken();
  pending = false; emit();
}
const isTestRuntime = import.meta.env.MODE === "test";
if (!isTestRuntime && typeof window !== "undefined" && typeof localStorage !== "undefined" && getAuthToken()) void refreshSession();
else pending = false;
// ── 체험 모드(VITE_GUEST_MODE=true): 로그인 없이도 임시 계정으로 자동 로그인해서 기존 기능을 그대로 쓰게 합니다. ──
const GUEST_KEY = "td_guest_cred";
export const guestModeEnabled = import.meta.env.VITE_GUEST_MODE === "true";
export const isGuestEmail = (email?: string | null) => Boolean(email && email.endsWith("@guest.example.com"));
type GuestCred = { email: string; password: string };
const readGuestCred = (): GuestCred | null => { try { const raw = localStorage.getItem(GUEST_KEY); return raw ? JSON.parse(raw) as GuestCred : null; } catch { return null; } };
let guestRefreshTimer: ReturnType<typeof setInterval> | null = null;
async function createGuestSession(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl("/auth/guest"), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const payload = await response.json().catch(() => null) as { data?: { accessToken?: string; user?: AuthUser; guest?: GuestCred } } | null;
    if (!response.ok || !payload?.data?.accessToken || !payload.data.user) return false;
    try { if (payload.data.guest) localStorage.setItem(GUEST_KEY, JSON.stringify(payload.data.guest)); } catch { /* 저장소 차단 시 이번 세션만 유지 */ }
    setAuthToken(payload.data.accessToken);
    cachedSession = { user: payload.data.user }; pending = false; emit();
    return true;
  } catch { return false; }
}
export async function ensureGuestSession(): Promise<void> {
  if (!guestModeEnabled) return;
  for (let waited = 0; pending && waited < 5000; waited += 50) await new Promise((resolve) => setTimeout(resolve, 50));
  if (!guestRefreshTimer) {
    // 액세스 토큰(약 1시간)이 끊기지 않도록, 아직 체험 계정으로 쓰는 중일 때만 주기적으로 다시 로그인합니다.
    guestRefreshTimer = setInterval(() => { const saved = readGuestCred(); if (saved && isGuestEmail(cachedSession?.user.email)) void authRequest("/sign-in", saved); }, 45 * 60 * 1000);
  }
  if (cachedSession) return;
  const cred = readGuestCred();
  if (cred) { const result = await authRequest("/sign-in", cred); if (!result.error) return; }
  await createGuestSession();
}
export const authClient = {
  useSession() { useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => `${pending}:${cachedSession?.user.id ?? ""}:${cachedSession?.user.emailVerified ?? ""}`, () => "false:"); return { data: cachedSession, isPending: pending }; },
  signIn: { email: (input: { email: string; password: string }) => authRequest("/sign-in", input) },
  signUp: { email: (input: { name: string; email: string; password: string }) => authRequest("/sign-up", input) },
  async signOut() { await authRequest("/sign-out", {}); clearAuthToken(); if (guestModeEnabled) await ensureGuestSession(); return { data: null, error: null }; }
};
export async function signOutFully() {
  if (supabaseAuthClient) await supabaseAuthClient.auth.signOut({ scope: "local" });
  await authClient.signOut();
}
