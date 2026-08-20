/**
 * 기존 화면 인터페이스를 유지하며 Supabase 백엔드 인증 API에 연결하는 세션 어댑터입니다.
 * AuthPage와 라우트 가드가 로그인·가입·로그아웃·세션 갱신 결과를 소비합니다.
 * access token은 브라우저 저장소가 차단되면 메모리에만 보관합니다.
 */
import { useSyncExternalStore } from "react";
import { apiUrl } from "@/lib/api-base";

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
export const authClient = {
  useSession() { useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => `${pending}:${cachedSession?.user.id ?? ""}:${cachedSession?.user.emailVerified ?? ""}`, () => "false:"); return { data: cachedSession, isPending: pending }; },
  signIn: { email: (input: { email: string; password: string }) => authRequest("/sign-in", input) },
  signUp: { email: (input: { name: string; email: string; password: string }) => authRequest("/sign-up", input) },
  async signOut() { await authRequest("/sign-out", {}); clearAuthToken(); return { data: null, error: null }; }
};
