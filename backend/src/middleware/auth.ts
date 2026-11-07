/**
 * Bearer access token을 Supabase Auth로 검증하고 profiles.role을 요청 컨텍스트에 넣습니다.
 * MyPage는 로그인, Seller는 seller/admin, Admin은 admin 권한을 이 미들웨어로 강제합니다.
 * 프론트 라우트 가드만 신뢰하지 않고 모든 보호 API에서 다시 검사합니다.
 */
import type { MiddlewareHandler } from "hono";
import { apiFailure } from "../http.js";
import { getAdminSupabase } from "../supabase.js";
import type { AppRole } from "../types.js";

export const optionalAuth: MiddlewareHandler = async (context, next) => {
  context.set("currentUser", null);
  const header = context.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return next();
  if (!header.slice(7).trim()) return context.json(apiFailure("INVALID_SESSION", "세션이 만료되었거나 유효하지 않습니다."), 401);
  try {
    const sb = getAdminSupabase();
    const { data, error } = await sb.auth.getUser(header.slice(7));
    if (error || !data.user) return context.json(apiFailure("INVALID_SESSION", "세션이 만료되었거나 유효하지 않습니다."), 401);
    const user = data.user;
    const fetchProfile = () => sb.from("profiles").select("name,role,is_suspended").eq("id", user.id).maybeSingle();
    let result = await fetchProfile();
    if (result.error) return context.json(apiFailure("AUTH_UNAVAILABLE", "인증 정보를 확인할 수 없습니다."), 503);
    if (!result.data) {
      const suppliedName = user.user_metadata?.name;
      const name = typeof suppliedName === "string" ? suppliedName.trim().slice(0, 50) || "사용자" : "사용자";
      const created = await sb.from("profiles").upsert({ id: user.id, name, role: "user" }, { onConflict: "id", ignoreDuplicates: true });
      if (created.error) return context.json(apiFailure("AUTH_UNAVAILABLE", "인증 정보를 확인할 수 없습니다."), 503);
      result = await fetchProfile();
      if (result.error || !result.data) return context.json(apiFailure("AUTH_UNAVAILABLE", "인증 정보를 확인할 수 없습니다."), 503);
    }
    if (result.data.is_suspended !== false) return context.json(apiFailure("ACCOUNT_SUSPENDED", "계정 상태를 확인해 주세요."), 403);
    const role = result.data.role;
    if (role !== "user" && role !== "seller" && role !== "admin") return context.json(apiFailure("AUTH_UNAVAILABLE", "인증 정보를 확인할 수 없습니다."), 503);
    context.set("currentUser", { id: user.id, email: user.email ?? "", name: result.data.name ?? "사용자", emailVerified: Boolean(user.email_confirmed_at), role });
  } catch {
    return context.json(apiFailure("AUTH_UNAVAILABLE", "인증 정보를 확인할 수 없습니다."), 503);
  }
  return next();
};
// [Codex | 2026-11-07] 수정범위: optionalAuth — 조회 실패 시 차단, 기존 역할 보호, 정지 계정 거부
export const requireAuth:MiddlewareHandler=async(c,next)=>c.var.currentUser?next():c.json(apiFailure("UNAUTHORIZED","로그인이 필요합니다."),401);
export const requireRole=(...roles:AppRole[]):MiddlewareHandler=>async(c,next)=>c.var.currentUser&&roles.includes(c.var.currentUser.role)?next():c.json(apiFailure("FORBIDDEN","이 기능을 사용할 권한이 없습니다."),403);
