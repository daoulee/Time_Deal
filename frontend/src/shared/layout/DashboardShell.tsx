/**
 * 판매자·관리자 화면의 사이드바와 대시보드 본문 구조를 제공합니다.
 * SellerPage와 AdminPage가 역할별 메뉴와 공통 레이아웃을 공유합니다.
 * 보호 라우트의 권한 검증은 별도 가드에서 수행하고 여기서는 표시만 담당합니다.
 */
import { ArrowLeft, BarChart3, Boxes, ClipboardList, HelpCircle, PackagePlus, SearchCheck, ShieldCheck, Star, Store, Users } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { StatusBadge } from "@/shared/components/StatusBadge";

const sellerLinks = [
  ["/seller", "대시보드", BarChart3], ["/seller/products", "상품 관리", Boxes], ["/seller/products/new", "상품 등록", PackagePlus], ["/seller/orders", "주문 현황", ClipboardList], ["/seller/analytics", "통계", BarChart3], ["/seller/inquiries", "판매자 문의", HelpCircle],
] as const;
const adminLinks = [
  ["/admin", "운영 현황", ShieldCheck], ["/admin/users", "고객 관리", Users], ["/admin/sellers", "판매자 관리", Store], ["/admin/products", "상품 관리", Boxes], ["/admin/inquiries", "문의 관리", HelpCircle], ["/admin/reviews", "리뷰 관리", Star], ["/admin/research", "자료 조사", SearchCheck],
] as const;

export function DashboardShell({ type, children }: { type: "seller" | "admin"; children: React.ReactNode }) {
  const links = type === "seller" ? sellerLinks : adminLinks;
  const title = type === "seller" ? "판매자 센터" : "관리자 콘솔";
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-brand"><span>타임딜</span><small>{title}</small></Link>
        <div className="dashboard-demo"><StatusBadge type="mock">{type === "seller" ? "판매자 권한 데모" : "관리자 전용"}</StatusBadge><p>{type === "seller" ? "role: seller 확장을 가정한 UI이며 실제 운영 권한이 아닙니다." : "RequireAdmin으로 서버 역할 확인 후 표시됩니다."}</p></div>
        <nav aria-label={`${title} 메뉴`}>{links.map(([to, label, Icon]) => <NavLink key={to} end={to === `/${type}`} to={to} className={({ isActive }: { isActive: boolean }) => isActive ? "active" : ""}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
        <Link to="/" className="back-home"><ArrowLeft size={17} /> 고객 사이트로</Link>
      </aside>
      <div className="dashboard-main"><header><div><p>{type === "seller" ? "SELLER DEMO" : "ADMIN"}</p><strong>{title}</strong></div><StatusBadge type="ready">API 연동 준비 중</StatusBadge></header><main>{children}</main></div>
    </div>
  );
}
