/**
 * 로그인 사용자의 참여 딜·주문·리뷰·문의·보안 설정을 관리하는 계정 화면입니다.
 * 백엔드 MyPage와 Inquiry 모듈 및 RequireAuth 보호 경로에서 사용합니다.
 * 현재 빈 상태와 API 연결 예정 항목을 실제 데이터처럼 표시하지 않습니다.
 */
import { KeyRound, MessageSquareText, PackageCheck, Shield, Star, TimerReset, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { StatusBadge } from "@/shared/components/StatusBadge";

const menu = [
  ["/mypage", "내 정보", UserRound], ["/mypage/deals", "참여 딜", TimerReset], ["/mypage/orders", "주문", PackageCheck], ["/mypage/reviews", "나의 리뷰", Star], ["/mypage/inquiries", "나의 문의", MessageSquareText], ["/mypage/security", "비밀번호 변경", KeyRound],
] as const;
const details: Record<string, [string, string]> = {
  "/mypage": ["내 정보", "회원 기본 정보와 이메일 인증 상태를 확인합니다."], "/mypage/deals": ["참여 딜", "내가 참여한 공동구매 진행 현황을 확인합니다."], "/mypage/orders": ["주문", "결제 연동 후 주문과 수령 상태가 표시됩니다."], "/mypage/reviews": ["나의 리뷰", "작성한 리뷰와 작성 가능한 상품을 관리합니다."], "/mypage/inquiries": ["나의 문의", "고객센터 문의와 답변 상태를 확인합니다."], "/mypage/security": ["비밀번호 변경", "인증된 세션에서 비밀번호 초기화와 변경을 진행합니다."],
};
export default function MyPage() {
  const path = useLocation().pathname;
  const [title, description] = details[path] ?? details["/mypage"];
  return <AppShell><section className="section-wrap account-layout"><aside className="account-sidebar"><div className="account-profile"><span><UserRound /></span><strong>로그인 사용자</strong><small>세션 기반 고객 화면</small></div><nav>{menu.map(([to, label, Icon]) => <Link className={path === to ? "active" : ""} key={to} to={to}><Icon size={18} />{label}</Link>)}</nav></aside><div className="account-content"><div className="account-heading"><div><p>MY TIMEDEAL</p><h1>{title}</h1><span>{description}</span></div><StatusBadge type="ready">API 연동 준비 중</StatusBadge></div>{path === "/mypage" ? <div className="profile-grid"><article><span>이메일</span><strong>현재 세션 이메일</strong><small>authClient 세션에서 표시 예정</small></article><article><span>회원 유형</span><strong>고객</strong><small>role: user</small></article><article><span>이메일 인증</span><strong>세션 상태 확인</strong><small>인증 흐름 보존</small></article><article><span>관심 지역</span><strong>지역 설정 준비 중</strong><small>추후 프로필 API 연결</small></article></div> : <div className="feature-placeholder"><Shield size={34} /><h2>{title} 기능을 연결하고 있습니다.</h2><p>화면 구조와 권한 경계는 준비되었으며 실제 데이터는 해당 API를 통해 교체합니다.</p><StatusBadge type="mock">현재 샘플/빈 상태</StatusBadge></div>}</div></section></AppShell>;
}
