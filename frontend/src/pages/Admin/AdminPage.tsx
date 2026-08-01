/**
 * 관리자가 고객·판매자·상품·문의·리뷰와 통계를 관리하는 운영 화면입니다.
 * 백엔드 Admin 모듈과 RequireAdmin 보호 경로에서만 사용됩니다.
 * admin 역할은 프론트 표시뿐 아니라 백엔드에서 다시 검증해야 합니다.
 */
import { Activity, Boxes, MessageSquareText, ShieldCheck, Store, Users } from "lucide-react";
import { useLocation } from "react-router-dom";
import { DashboardShell } from "@/shared/layout/DashboardShell";
import { StatusBadge } from "@/shared/components/StatusBadge";

const info: Record<string, [string, string]> = {
  "/admin": ["운영 현황", "핵심 서비스 상태와 관리 대기 항목을 요약합니다."], "/admin/users": ["고객 관리", "가입 고객과 인증·활동 상태를 관리합니다."], "/admin/sellers": ["판매자 관리", "판매자 승인과 role 확장 상태를 관리합니다."], "/admin/products": ["상품 관리", "등록 상품의 노출과 타임딜 상태를 검수합니다."], "/admin/inquiries": ["문의 관리", "고객·판매자 문의를 유형별로 처리합니다."], "/admin/reviews": ["리뷰 관리", "신고와 노출 상태를 검토합니다."], "/admin/research": ["자료 조사", "운영 분석을 위한 자료와 통계 경계를 준비합니다."],
};
export default function AdminPage() { const path = useLocation().pathname; const [title, description] = info[path] ?? info["/admin"]; return <DashboardShell type="admin"><div className="dashboard-page-heading"><div><p>관리자 기능</p><h1>{title}</h1><span>{description}</span></div><StatusBadge type="ready">실시간 통계 미연동</StatusBadge></div><div className="metric-grid"><article><span><Users /></span><p>고객</p><strong>—</strong><small>DB 연결 후 표시</small></article><article><span><Store /></span><p>판매자</p><strong>—</strong><small>role 확장 예정</small></article><article><span><Boxes /></span><p>상품</p><strong>6</strong><small>샘플 카탈로그</small></article><article><span><MessageSquareText /></span><p>문의 대기</p><strong>—</strong><small>API 연동 전</small></article></div><section className="dashboard-panel"><div><p>MANAGEMENT</p><h2>{title}</h2></div><div className="admin-empty"><Activity /><div><strong>{description}</strong><p>이 화면은 운영 완료가 아닌 관리자 정보 구조와 권한 경계의 프로토타입입니다.</p></div><span><ShieldCheck size={17} /> RequireAdmin 보호</span></div></section></DashboardShell>; }
