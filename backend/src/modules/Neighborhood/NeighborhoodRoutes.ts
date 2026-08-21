/**
 * 모바일 팀의 별도 Supabase 프로젝트(deals/reservations/wishlists)를 읽고 쓰는 연동 라우트입니다.
 * 모바일 앱은 자체 Supabase Auth 계정(user_id)을 쓰므로, 웹에서도 같은 모바일 계정으로 로그인해야
 * 예약·찜이 모바일 앱에 실시간으로 그대로 보입니다(같은 reservations/wishlists 행, 같은 user_id).
 * 우리 웹 로그인과는 독립적인 별도 세션이며, 우리 DB에는 아무 것도 저장하지 않습니다.
 */
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { translateAuthErrorMessage } from "../../auth-error.js";
import { apiFailure, apiSuccess } from "../../http.js";
import { getMobileSupabase } from "../../supabase.js";

export const neighborhoodRouter = new Hono();

const requireMobileAuth: MiddlewareHandler = async (context, next) => {
  const token = context.req.header("X-Mobile-Token");
  if (!token) return context.json(apiFailure("MOBILE_UNAUTHORIZED", "모바일 계정 로그인이 필요합니다."), 401);
  try {
    const supabase = getMobileSupabase(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return context.json(apiFailure("MOBILE_UNAUTHORIZED", "모바일 계정 로그인이 만료되었거나 유효하지 않습니다."), 401);
    context.set("mobileUser", { id: data.user.id, email: data.user.email ?? "" });
    context.set("mobileToken", token);
    return next();
  } catch {
    return context.json(apiFailure("MOBILE_SUPABASE_UNCONFIGURED", "모바일 연동이 아직 설정되지 않았습니다."), 503);
  }
};

// ── 공개 조회: 동네·딜 목록 ──────────────────────────────────────
neighborhoodRouter.get("/neighborhood/neighborhoods", async (context) => {
  const supabase = getMobileSupabase();
  const { data, error } = await supabase.from("deals").select("neighborhood").not("neighborhood", "is", null).gt("expires_at", new Date().toISOString());
  if (error) return context.json(apiFailure("QUERY_FAILED", "동네 목록을 조회하지 못했습니다."), 502);
  const names = Array.from(new Set((data ?? []).map((row) => row.neighborhood as string).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko"));
  return context.json(apiSuccess({ neighborhoods: names }));
});
neighborhoodRouter.get("/neighborhood/deals", async (context) => {
  const neighborhood = context.req.query("neighborhood");
  const supabase = getMobileSupabase();
  let query = supabase.from("deals").select("*").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
  if (neighborhood) query = query.eq("neighborhood", neighborhood);
  const { data, error } = await query;
  return error ? context.json(apiFailure("QUERY_FAILED", "동네 딜 목록을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ deals: data ?? [] }));
});

// ── 모바일 계정 로그인/회원가입 프록시 (우리 웹 로그인과 별개) ──────
const emailAuthInput = z.object({ email: z.string().email(), password: z.string().min(6).max(72) }).strict();
neighborhoodRouter.post("/neighborhood/auth/sign-in", async (context) => {
  const parsed = emailAuthInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "이메일과 비밀번호를 확인하세요."), 400);
  const supabase = getMobileSupabase();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.session || !data.user) return context.json(apiFailure("SIGNIN_FAILED", translateAuthErrorMessage(error?.message ?? "", "이메일 또는 비밀번호가 올바르지 않습니다.")), 401);
  return context.json(apiSuccess({ accessToken: data.session.access_token, refreshToken: data.session.refresh_token, user: { id: data.user.id, email: data.user.email ?? "" } }));
});
neighborhoodRouter.post("/neighborhood/auth/sign-up", async (context) => {
  const parsed = emailAuthInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "이메일과 비밀번호(6자 이상)를 확인하세요."), 400);
  const supabase = getMobileSupabase();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error || !data.user) return context.json(apiFailure("SIGNUP_FAILED", translateAuthErrorMessage(error?.message ?? "", "회원가입에 실패했습니다.")), 400);
  const needsConfirmation = !data.session;
  return context.json(apiSuccess({ needsConfirmation, accessToken: data.session?.access_token ?? null, refreshToken: data.session?.refresh_token ?? null, user: { id: data.user.id, email: data.user.email ?? "" } }), 201);
});
neighborhoodRouter.post("/neighborhood/auth/refresh", async (context) => {
  const parsed = z.object({ refreshToken: z.string().min(10) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "refreshToken이 필요합니다."), 400);
  const supabase = getMobileSupabase();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: parsed.data.refreshToken });
  if (error || !data.session) return context.json(apiFailure("REFRESH_FAILED", "모바일 계정 세션을 갱신하지 못했습니다. 다시 로그인해주세요."), 401);
  return context.json(apiSuccess({ accessToken: data.session.access_token, refreshToken: data.session.refresh_token }));
});

// ── 내 예약/찜 (모바일 계정 로그인 필요) ─────────────────────────
neighborhoodRouter.get("/neighborhood/me/reservations", requireMobileAuth, async (context) => {
  const supabase = getMobileSupabase(context.var.mobileToken!);
  const { data, error } = await supabase.from("reservations").select("*,deals(*)").eq("user_id", context.var.mobileUser!.id).order("reserved_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "예약 내역을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ reservations: data ?? [] }));
});
neighborhoodRouter.get("/neighborhood/me/wishlist", requireMobileAuth, async (context) => {
  const supabase = getMobileSupabase(context.var.mobileToken!);
  const { data, error } = await supabase.from("wishlists").select("deal_id,deals(*)").eq("user_id", context.var.mobileUser!.id);
  return error ? context.json(apiFailure("QUERY_FAILED", "찜 목록을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ items: data ?? [] }));
});

// ── 예약하기/취소하기 (재고는 모바일 팀이 만든 원자적 RPC로 처리) ──
neighborhoodRouter.post("/neighborhood/deals/:id/reserve", requireMobileAuth, async (context) => {
  const dealId = context.req.param("id");
  const mobileUser = context.var.mobileUser!;
  const supabase = getMobileSupabase(context.var.mobileToken!);

  const { data: deal, error: dealError } = await supabase.from("deals").select("id,remaining_stock,expires_at").eq("id", dealId).maybeSingle();
  if (dealError || !deal) return context.json(apiFailure("NOT_FOUND", "딜을 찾을 수 없습니다."), 404);
  if (new Date(deal.expires_at).getTime() <= Date.now()) return context.json(apiFailure("EXPIRED", "마감된 딜입니다."), 409);
  if (deal.remaining_stock <= 0) return context.json(apiFailure("OUT_OF_STOCK", "재고가 모두 소진되었습니다."), 409);

  const { data: already } = await supabase.from("reservations").select("id").eq("user_id", mobileUser.id).eq("deal_id", dealId).eq("status", "진행중").maybeSingle();
  if (already) return context.json(apiFailure("ALREADY_RESERVED", "이미 예약한 딜입니다."), 409);

  const { data: reservation, error: insertError } = await supabase.from("reservations").insert({ user_id: mobileUser.id, deal_id: dealId, status: "진행중", reserved_at: new Date().toISOString() }).select().single();
  if (insertError || !reservation) return context.json(apiFailure("SAVE_FAILED", "예약을 저장하지 못했습니다."), 400);

  const { error: rpcError } = await supabase.rpc("decrement_stock", { deal_id: dealId });
  const { data: afterDeal } = await supabase.from("deals").select("remaining_stock").eq("id", dealId).maybeSingle();
  // decrement_stock은 재고가 0이어도 조용히 아무 일도 안 하고 성공 응답을 주므로, 실제로 줄었는지 다시 읽어서 확인합니다.
  if (rpcError || !afterDeal || afterDeal.remaining_stock >= deal.remaining_stock) {
    await supabase.from("reservations").delete().eq("id", reservation.id);
    return context.json(apiFailure("OUT_OF_STOCK", "방금 재고가 모두 소진되어 예약할 수 없습니다."), 409);
  }

  return context.json(apiSuccess({ reservation }), 201);
});
neighborhoodRouter.post("/neighborhood/reservations/:id/cancel", requireMobileAuth, async (context) => {
  const id = context.req.param("id");
  const supabase = getMobileSupabase(context.var.mobileToken!);
  const { data: reservation } = await supabase.from("reservations").select("id,deal_id,status,user_id").eq("id", id).maybeSingle();
  if (!reservation || reservation.user_id !== context.var.mobileUser!.id) return context.json(apiFailure("NOT_FOUND", "예약을 찾을 수 없습니다."), 404);
  if (reservation.status !== "진행중") return context.json(apiFailure("INVALID_STATE", "취소할 수 없는 상태입니다."), 409);
  const { error } = await supabase.from("reservations").update({ status: "취소" }).eq("id", id);
  if (error) return context.json(apiFailure("SAVE_FAILED", "예약 취소에 실패했습니다."), 400);
  await supabase.rpc("increment_stock", { deal_id: reservation.deal_id });
  return context.json(apiSuccess({ cancelled: true }));
});

// ── 찜 토글 ───────────────────────────────────────────────────
neighborhoodRouter.post("/neighborhood/deals/:id/wishlist/toggle", requireMobileAuth, async (context) => {
  const key = { user_id: context.var.mobileUser!.id, deal_id: context.req.param("id") };
  const supabase = getMobileSupabase(context.var.mobileToken!);
  const { data: existing } = await supabase.from("wishlists").select("user_id").match(key).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("wishlists").delete().match(key);
    return error ? context.json(apiFailure("SAVE_FAILED", "찜을 해제하지 못했습니다."), 400) : context.json(apiSuccess({ liked: false }));
  }
  const { error } = await supabase.from("wishlists").insert(key);
  return error ? context.json(apiFailure("SAVE_FAILED", "찜하지 못했습니다."), 400) : context.json(apiSuccess({ liked: true }), 201);
});
