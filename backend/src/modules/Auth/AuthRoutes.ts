/**
 * 회원가입·로그인·로그아웃·세션 확인·비밀번호 재설정 메일 API를 제공합니다.
 * 비밀번호 복구 redirect는 클라이언트 전체 URL을 신뢰하지 않고 서버 allowlist의 프론트 고정 경로를 사용합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { getAdminSupabase, getAnonSupabase } from "../../supabase.js";
import { requireAuth } from "../../middleware/auth.js";
import { passwordResetRedirect } from "../../config.js";
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
    if (data.session) await getAdminSupabase().from("profiles").upsert({ id: data.user.id, name: parsed.data.name, role: "user" });
    return context.json(apiSuccess({ accessToken: data.session?.access_token ?? null, user: userView(data.user, { name: parsed.data.name }) }), 201);
  } catch { return context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 설정하세요."), 503); }
});

authRouter.post("/sign-in", async (context) => {
  const parsed = credentials.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "이메일과 비밀번호를 확인하세요."), 400);
  try {
    const { data, error } = await getAnonSupabase().auth.signInWithPassword(parsed.data);
    if (error || !data.user || !data.session) return context.json(apiFailure("SIGNIN_FAILED", translateAuthErrorMessage(error?.message, "이메일 또는 비밀번호가 올바르지 않습니다.")), 401);
    const { data: profile } = await getAdminSupabase().from("profiles").select("name,role,is_suspended").eq("id", data.user.id).maybeSingle();
    if (profile?.is_suspended) return context.json(apiFailure("ACCOUNT_SUSPENDED", "정지된 계정입니다. 고객센터에 문의해 주세요."), 403);
    return context.json(apiSuccess({ accessToken: data.session.access_token, user: userView(data.user, profile ?? undefined) }));
  } catch { return context.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 설정하세요."), 503); }
});

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
