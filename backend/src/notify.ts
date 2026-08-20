/**
 * 다른 모듈에서 인앱 알림 센터(notifications 테이블)에 알림을 남길 때 쓰는 공용 헬퍼입니다.
 * 실패해도 원래 요청 흐름을 막지 않도록 항상 조용히 무시합니다.
 */
import { getAdminSupabase } from "./supabase.js";

export async function notifyUser(userId: string, type: string, title: string, body: string, link?: string) {
  try {
    await getAdminSupabase().from("notifications").insert({ user_id: userId, type, title, body, link: link ?? null });
  } catch {
    // 알림 저장 실패는 원래 작업을 막지 않습니다.
  }
}
