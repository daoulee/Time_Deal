/**
 * Supabase Auth 이메일 OTP 발송·검증을 담당하는 인증 보조 모듈입니다.
 * `/send`는 가입 확인 또는 기존 계정 로그인용 코드를 보내고, `/verify`는
 * Supabase가 발급한 코드만 검증해 access token을 반환합니다.
 * service role key는 사용하지 않으며, 반환값에도 서버 비밀값을 포함하지 않습니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { getAnonSupabase, getAdminSupabase } from "../../supabase.js";
import { translateAuthErrorMessage } from "../../auth-error.js";

export const emailOtpRouter = new Hono();
const emailInput = z.object({ email: z.string().email(), redirectTo: z.string().url().optional() });
const verifyInput = emailInput.extend({ token: z.string().regex(/^\d{6}$/, "인증 코드는 6자리 숫자여야 합니다."), type: z.enum(["signup", "email"]).default("email") });

type AuthUserLike = { id: string; email?: string | null; email_confirmed_at?: string | null; user_metadata?: { name?: unknown } | null };
const userView = (user: AuthUserLike, profile?: { name?: string | null; role?: string | null } | null) => ({
  id: user.id,
  email: user.email ?? "",
  name: profile?.name ?? String(user.user_metadata?.name ?? "사용자"),
  emailVerified: Boolean(user.email_confirmed_at),
  role: profile?.role ?? "user",
});

emailOtpRouter.post("/send", async (c) => {
  const parsed = emailInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(apiFailure("INVALID_INPUT", "이메일 주소를 확인하세요."), 400);

  try {
    const { error } = await getAnonSupabase().auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: parsed.data.redirectTo,
      },
    });
    if (error) return c.json(apiFailure("OTP_SEND_FAILED", translateAuthErrorMessage(error.message, "인증 코드를 보내지 못했습니다.")), 400);
    return c.json(apiSuccess({ sent: true, email: parsed.data.email }));
  } catch {
    return c.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 먼저 설정하세요."), 503);
  }
});

emailOtpRouter.post("/verify", async (c) => {
  const parsed = verifyInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(apiFailure("INVALID_INPUT", "이메일과 6자리 인증 코드를 확인하세요."), 400);

  try {
    const { data, error } = await getAnonSupabase().auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: parsed.data.type,
    });
    if (error || !data.user || !data.session) return c.json(apiFailure("OTP_VERIFY_FAILED", translateAuthErrorMessage(error?.message, "인증 코드가 만료되었거나 올바르지 않습니다.")), 401);

    const { data: profile } = await getAdminSupabase().from("profiles").select("name,role").eq("id", data.user.id).maybeSingle();
    return c.json(apiSuccess({ accessToken: data.session.access_token, user: userView(data.user, profile) }));
  } catch {
    return c.json(apiFailure("SUPABASE_UNCONFIGURED", "Supabase 환경변수를 먼저 설정하세요."), 503);
  }
});
