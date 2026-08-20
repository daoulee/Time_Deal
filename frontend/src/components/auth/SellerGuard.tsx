/**
 * 모든 `/seller/*` 경로에서 로그인과 seller 역할을 실제 `/me/profile` API로 확인합니다.
 * 실제 역할 검증을 적용하며 관리자는 관리자 화면을 사용하도록 판매자 경로에 자동 통과시키지 않습니다.
 */
import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { RequireAuth } from "./route-guards";

export function RequireSeller({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "allowed" | "forbidden">("checking");
  useEffect(() => {
    let active = true;
    void apiFetch("/me/profile").then(async (response) => {
      const body = await response.json().catch(() => null) as { ok?: boolean; data?: { profile?: { role?: string } } } | null;
      if (active) setState(response.ok && body?.data?.profile?.role === "seller" ? "allowed" : "forbidden");
    }).catch(() => { if (active) setState("forbidden"); });
    return () => { active = false; };
  }, []);
  return <RequireAuth>{state === "checking" ? <div className="auth-loading"><span aria-label="판매자 권한 확인 중" /></div> : state === "allowed" ? children : <div className="empty-state page-empty"><h1>판매자 권한이 필요합니다.</h1><p>승인된 판매자 계정으로 로그인해 주세요.</p></div>}</RequireAuth>;
}
