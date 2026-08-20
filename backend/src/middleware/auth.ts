/**
 * Bearer access token을 Supabase Auth로 검증하고 profiles.role을 요청 컨텍스트에 넣습니다.
 * MyPage는 로그인, Seller는 seller/admin, Admin은 admin 권한을 이 미들웨어로 강제합니다.
 * 프론트 라우트 가드만 신뢰하지 않고 모든 보호 API에서 다시 검사합니다.
 */
import type { MiddlewareHandler } from "hono"; import { apiFailure } from "../http.js"; import { getAdminSupabase } from "../supabase.js"; import type { AppRole } from "../types.js";
export const optionalAuth:MiddlewareHandler=async(c,next)=>{c.set("currentUser",null); const h=c.req.header("Authorization"); if(!h?.startsWith("Bearer ")) return next(); try{const sb=getAdminSupabase(); const {data,error}=await sb.auth.getUser(h.slice(7)); if(error||!data.user) return c.json(apiFailure("INVALID_SESSION","세션이 만료되었거나 유효하지 않습니다."),401); let {data:p}=await sb.from("profiles").select("name,role").eq("id",data.user.id).maybeSingle(); if(!p){const fallbackName=String(data.user.user_metadata?.name??"사용자"); const {data:created}=await sb.from("profiles").upsert({id:data.user.id,name:fallbackName,role:"user"}).select("name,role").maybeSingle(); p=created??{name:fallbackName,role:"user"};} c.set("currentUser",{id:data.user.id,email:data.user.email??"",name:p?.name??String(data.user.user_metadata?.name??"사용자"),emailVerified:Boolean(data.user.email_confirmed_at),role:(p?.role??"user") as AppRole}); return next()}catch{return c.json(apiFailure("SUPABASE_UNCONFIGURED","Supabase 환경변수를 먼저 설정하세요."),503)}};
export const requireAuth:MiddlewareHandler=async(c,next)=>c.var.currentUser?next():c.json(apiFailure("UNAUTHORIZED","로그인이 필요합니다."),401);
export const requireRole=(...roles:AppRole[]):MiddlewareHandler=>async(c,next)=>c.var.currentUser&&roles.includes(c.var.currentUser.role)?next():c.json(apiFailure("FORBIDDEN","이 기능을 사용할 권한이 없습니다."),403);
