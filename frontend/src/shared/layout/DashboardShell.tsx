/**
 * 판매자·관리자 화면의 사이드바와 대시보드 본문 구조를 제공합니다.
 * 보호 라우트의 실제 역할 검증을 통과한 사용자에게만 운영 메뉴와 API 연결 상태를 표시합니다.
 */
import { AlertTriangle, ArrowLeft, BarChart3, Boxes, ClipboardList, FileClock, HelpCircle, MapPinned, MessageSquareWarning, PackagePlus, SearchCheck, ShieldCheck, Star, Store, Users } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { StatusBadge } from "@/shared/components/StatusBadge";

const sellerLinks = [["/seller", "대시보드", BarChart3], ["/seller/products", "상품 관리", Boxes], ["/seller/products/new", "상품 등록", PackagePlus], ["/seller/orders", "주문 현황", ClipboardList], ["/seller/analytics", "통계·픽업", BarChart3], ["/seller/restock-requests", "재입고 요청", PackagePlus], ["/seller/inquiries", "판매자 문의", HelpCircle]] as const;
const adminLinks = [["/admin", "운영 현황", ShieldCheck], ["/admin/orders", "주문 운영", ClipboardList], ["/admin/users", "사용자 관리", Users], ["/admin/sellers", "판매자 신청", Store], ["/admin/products", "상품·딜", Boxes], ["/admin/inquiries", "문의 관리", HelpCircle], ["/admin/reviews", "리뷰 관리", Star], ["/admin/community", "커뮤니티", MessageSquareWarning], ["/admin/pickups", "픽업 운영", MapPinned], ["/admin/restock-requests", "재입고 요청", PackagePlus], ["/admin/audit-logs", "감사 로그", FileClock], ["/admin/error-logs", "에러 로그", AlertTriangle], ["/admin/research", "통계", SearchCheck]] as const;

export function DashboardShell({ type, children }: { type: "seller" | "admin"; children: React.ReactNode }) {
  const links = type === "seller" ? sellerLinks : adminLinks; const title = type === "seller" ? "판매자 센터" : "관리자 콘솔";
  return <div className="dashboard-shell"><aside className="dashboard-sidebar"><Link to="/" className="dashboard-brand"><img src="/images/deal-logo.png" alt="타임딜" className="dashboard-brand-logo" /><small>{title}</small></Link><div className="dashboard-role"><StatusBadge type="live">{type === "seller" ? "seller 권한" : "admin 권한"}</StatusBadge><p>백엔드 역할 검증을 통과한 운영 계정입니다.</p></div><nav aria-label={`${title} 메뉴`}>{links.map(([to, label, Icon]) => <NavLink key={to} end={to === `/${type}`} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><Link to="/" className="back-home"><ArrowLeft size={17} /> 고객 사이트로</Link></aside><div className="dashboard-main"><header><div><p>{type === "seller" ? "SELLER OPERATIONS" : "ADMIN OPERATIONS"}</p><strong>{title}</strong></div><StatusBadge type="live">운영 API 연결</StatusBadge></header><main>{children}</main></div></div>;
}
