/**
 * 판매자가 상품 등록·수정, 주문, 통계와 문의를 관리하는 대시보드 화면입니다.
 * 백엔드 Seller 모듈과 seller/admin 역할 보호 경계를 통해 데이터를 받습니다.
 * 샘플 수치와 API 미연동 상태를 운영 지표로 오인시키지 않습니다.
 */
import { ArrowUpRight, Box, PackageCheck, TrendingUp, Users } from "lucide-react";
import { useLocation } from "react-router-dom";
import { DashboardShell } from "@/shared/layout/DashboardShell";
import { StatusBadge } from "@/shared/components/StatusBadge";

const info: Record<string, [string, string]> = {
  "/seller": ["판매자 대시보드", "상품과 주문 흐름을 한눈에 확인하는 데모입니다."], "/seller/products": ["상품 관리", "등록 상품의 공개 상태와 타임딜 진행 여부를 관리합니다."], "/seller/products/new": ["상품 등록", "상품 정보와 목표 인원을 입력하는 등록 폼 자리입니다."], "/seller/orders": ["주문 현황", "결제 연동 후 주문과 픽업 상태를 확인합니다."], "/seller/analytics": ["상품 통계", "조회·참여·전환 지표를 제공할 예정입니다."], "/seller/inquiries": ["판매자 문의", "입점 및 운영 관련 문의 상태를 관리합니다."],
};
export default function SellerPage() {
  const path = useLocation().pathname; const [title, description] = info[path] ?? info["/seller"];
  return <DashboardShell type="seller"><div className="dashboard-page-heading"><div><p>판매자 기능</p><h1>{title}</h1><span>{description}</span></div><StatusBadge type="mock">데모 전용</StatusBadge></div><div className="metric-grid"><article><span><Box /></span><p>등록 상품</p><strong>6</strong><small>샘플</small></article><article><span><Users /></span><p>참여 합계</p><strong>61</strong><small>샘플</small></article><article><span><PackageCheck /></span><p>주문 처리</p><strong>—</strong><small>연동 준비 중</small></article><article><span><TrendingUp /></span><p>전환율</p><strong>—</strong><small>통계 준비 중</small></article></div><section className="dashboard-panel"><div><p>현재 화면</p><h2>{title}</h2></div><div className="placeholder-table"><div className="table-head"><span>항목</span><span>상태</span><span>데이터</span></div><div><span>{description}</span><span><StatusBadge type="ready" /></span><span><ArrowUpRight size={18} /> API 교체 지점</span></div></div></section></DashboardShell>;
}
