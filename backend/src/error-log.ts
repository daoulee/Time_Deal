/**
 * 백엔드 미처리 예외와 프론트 런타임 에러를 error_logs 테이블에 기록해 관리자 콘솔에서 보이게 합니다.
 * 로깅 자체가 실패해도(테이블 마이그레이션 전, Supabase 미설정 등) 원래 요청/에러 처리를 절대 막지 않습니다.
 */
import { getAdminSupabase } from "./supabase.js";

export type ErrorLogInput = {
  source: "backend" | "frontend";
  level?: "error" | "warn";
  message: string;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  userAgent?: string | null;
};

export function logError(input: ErrorLogInput) {
  try {
    void getAdminSupabase()
      .from("error_logs")
      .insert({
        source: input.source,
        level: input.level ?? "error",
        message: input.message.slice(0, 2000),
        stack: input.stack ? input.stack.slice(0, 8000) : null,
        path: input.path ?? null,
        method: input.method ?? null,
        status_code: input.statusCode ?? null,
        request_id: input.requestId ?? null,
        user_id: input.userId ?? null,
        user_agent: input.userAgent ? input.userAgent.slice(0, 500) : null,
      })
      .then(() => {}, () => {});
  } catch {
    /* Supabase 미설정 등으로 기록에 실패해도 무시합니다. */
  }
}
