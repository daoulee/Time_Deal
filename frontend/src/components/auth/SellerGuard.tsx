/**
 * 모든 `/seller/*` 경로에서 로그인과 seller·admin 역할을 실제 `/me/profile` API로 확인합니다.
 * 관리자는 승인된 판매자와 마찬가지로 판매자 센터를 사용할 수 있습니다.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { RequireAuth } from "./route-guards";

export function RequireSeller({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "allowed" | "forbidden">("checking");
  useEffect(() => {
    let active = true;
    void apiFetch("/me/profile").then(async (response) => {
      const body = await response.json().catch(() => null) as { ok?: boolean; data?: { profile?: { role?: string } } } | null;
      const role = body?.data?.profile?.role;
      if (active) setState(response.ok && (role === "seller" || role === "admin") ? "allowed" : "forbidden");
    }).catch(() => { if (active) setState("forbidden"); });
    return () => { active = false; };
  }, []);
  return <RequireAuth>{state === "checking" ? <div className="auth-loading"><span aria-label="판매자 권한 확인 중" /></div> : state === "allowed" ? children : <div className="empty-state page-empty"><h1>판매자 권한이 필요합니다.</h1><p>승인된 판매자 계정으로 로그인하거나 마이페이지에서 판매자 신청을 완료해 주세요.</p><Link className="primary-button" to="/mypage/seller-application">판매자 신청하기</Link></div>}</RequireAuth>;
}
