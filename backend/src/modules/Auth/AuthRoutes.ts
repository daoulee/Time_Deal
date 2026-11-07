/**
 * 회원가입·로그인·로그아웃·세션 확인·비밀번호 재설정 메일 API를 제공합니다.
 * 비밀번호 복구 redirect는 클라이언트 전체 URL을 신뢰하지 않고 서버 allowlist의 프론트 고정 경로를 사용합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { getAdminSupabase, getAnonSupabase } from "../../supabase.js";
import { requireAuth } from "../../middleware/auth.js";
import { config, passwordResetRedirect } from "../../config.js";
import { translateAuthErrorMessage } from "../../auth-error.js";

interface AuthUser { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> }
interface ProfileView { name?: string; role?: string }
export const authRouter = new Hono();
const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) }).strict();
const userView = (user: AuthUser, profile?: ProfileView) => ({ id: user.id, email: user.email ?? "", name: profile?.name ?? String(user.user_metadata?.name ?? "사용자"), emailVerified: Boolean(user.email_confirmed_at), role: profile?.role ?? "user" });

authRouter.post("/sign-up", async (context) => {
  const parsed = credentials.extend({ name: z.string().min(2).max(50) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "회원가입 입력값을 확인하세요.", parsed.error.flatten()), 400);
  try {
    const { data, error } = await getAnonSupabase().auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { name: parsed.data.name } } });
    if (error || !data.user) return context.json(apiFailure("SIGNUP_FAILED", translateAuthErrorMessage(error?.message, "회원가입에 실패했습니다.")), 400);
    if (data.session) {
      const { error: profileError } = await getAdminSupabase().from("profiles").upsert({ id: data.user.id, name: parsed.data.name, role: "user" }, { onConflict: "id", ignoreDuplicates: true });
      if (profileError) return context.json(apiFailure("AUTH_UNAVAILABLE", "계정 정보를 확인할 수 없습니다."), 503);
    }
    return context.json(apiSuccess({ accessToken: data.session?.access_token ?? null, user: userView(data.user, { name: parsed.data.name }) }), 201);
  } catch { return context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 설정하세요."), 503); }
});
// [Codex | 2026-11-07] 수정범위: sign-up — 기존 역할을 덮어쓰지 않고 저장 오류 시 차단

authRouter.post("/sign-in", async (context) => {
  const parsed = credentials.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "이메일과 비밀번호를 확인하세요."), 400);
  try {
    const { data, error } = await getAnonSupabase().auth.signInWithPassword(parsed.data);
    if (error || !data.user || !data.session) return context.json(apiFailure("SIGNIN_FAILED", translateAuthErrorMessage(error?.message, "이메일 또는 비밀번호가 올바르지 않습니다.")), 401);
    const { data: profile, error: profileError } = await getAdminSupabase().from("profiles").select("name,role,is_suspended").eq("id", data.user.id).maybeSingle();
    if (profileError || !profile) return context.json(apiFailure("AUTH_UNAVAILABLE", "계정 정보를 확인할 수 없습니다."), 503);
    if (profile.is_suspended !== false) return context.json(apiFailure("ACCOUNT_SUSPENDED", "정지된 계정입니다. 고객센터에 문의해 주세요."), 403);
    return context.json(apiSuccess({ accessToken: data.session.access_token, user: userView(data.user, profile ?? undefined) }));
  } catch { return context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 설정하세요."), 503); }
});
// [Codex | 2026-11-07] 수정범위: sign-in — 프로필 조회 오류 시 인증 결과 반환 차단

// 대회 심사·투표 기간처럼 로그인 없이 체험시킬 때만(GUEST_MODE=true) 열리는 임시 계정 발급 API입니다.
// 개인정보가 없는 일회용 계정을 만들고 판매자 권한까지만 부여합니다(admin 권한은 절대 부여하지 않음).
authRouter.post("/guest", async (context) => {
  if (!config.guestMode) return context.json(apiFailure("GUEST_DISABLED", "체험 모드가 꺼져 있습니다."), 403);
  try {
    const email = `guest-${crypto.randomUUID()}@guest.example.com`;
    const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const admin = getAdminSupabase();
    const { data: allowed, error: quotaError } = await admin.rpc("timedeal_poc_consume_guest_quota");
    if (quotaError || typeof allowed !== "boolean") return context.json(apiFailure("GUEST_UNAVAILABLE", "체험 모드를 잠시 사용할 수 없습니다."), 503);
    if (!allowed) return context.json(apiFailure("GUEST_LIMIT", "오늘의 체험 계정 한도에 도달했습니다."), 429);
    // [Codex | 2026-11-06] 게스트 — 서버 재시작에도 유지되는 일일 생성 상한
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "체험 사용자" } });
    if (created.error || !created.data.user) return context.json(apiFailure("GUEST_FAILED", "체험 계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요."), 502);
    try {
      const { error: profileError } = await admin.from("profiles").upsert({ id: created.data.user.id, name: "체험 사용자", role: "seller" });
      if (profileError) throw new Error("guest profile unavailable");
      const { data, error } = await getAnonSupabase().auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) throw new Error("guest session unavailable");
      return context.json(apiSuccess({ accessToken: data.session.access_token, user: userView(data.user, { name: "체험 사용자", role: "seller" }), guest: { email, password } }), 201);
    } catch {
      try {
        const { error: cleanupError } = await admin.auth.admin.deleteUser(created.data.user.id);
        if (cleanupError) console.warn("guest cleanup failed");
      } catch { console.warn("guest cleanup failed"); }
      return context.json(apiFailure("GUEST_FAILED", "체험 계정으로 로그인하지 못했습니다."), 502);
    }
  } catch { return context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 설정하세요."), 503); }
});
// [Codex | 2026-11-06] 게스트 발급 — 판매자 프로필·세션 실패 시 생성 직후 계정 정리

authRouter.get("/session", requireAuth, (context) => context.json(apiSuccess({ accessToken: null, user: context.var.currentUser })));
authRouter.post("/sign-out", requireAuth, (context) => context.json(apiSuccess({ signedOut: true })));
authRouter.post("/forgot-password", async (context) => {
  const parsed = z.object({ email: z.string().email().max(254) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "이메일을 확인하세요."), 400);
  try {
    const { error } = await getAnonSupabase().auth.resetPasswordForEmail(parsed.data.email, { redirectTo: passwordResetRedirect() });
    if (error) return context.json(apiFailure("RESET_FAILED", translateAuthErrorMessage(error.message, "비밀번호 재설정 메일을 보내지 못했습니다.")), 400);
    return context.json(apiSuccess({ sent: true, redirectPath: "/auth/reset-password" }));
  } catch { return context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 설정하세요."), 503); }
});
