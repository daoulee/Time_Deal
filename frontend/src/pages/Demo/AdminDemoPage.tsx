/**
 * 로그인 없이 관리자 콘솔의 화면 구성을 둘러볼 수 있는 데모입니다.
 * 모든 데이터는 샘플이며, 버튼은 실제로 아무것도 변경하지 않습니다.
 */
import { useState } from "react";
import { ArrowLeft, Boxes, ShieldCheck, Store, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/shared/components/StatusBadge";

const TABS = [
  ["dashboard", "운영 현황", ShieldCheck],
  ["users", "사용자 관리", Users],
  ["sellers", "판매자 신청", Store],
  ["products", "상품·딜", Boxes],
] as const;
type Tab = (typeof TABS)[number][0];

const SAMPLE_USERS = [
  { name: "김민준", email: "minjun***@gmail.com", role: "customer", status: "정상" },
  { name: "이서연", email: "seoyeon***@naver.com", role: "seller", status: "정상" },
  { name: "박도윤", email: "doyun***@gmail.com", role: "customer", status: "정지" },
  { name: "최지우", email: "jiwoo***@kakao.com", role: "customer", status: "정상" },
  { name: "정하은", email: "haeun***@naver.com", role: "seller", status: "정상" },
  { name: "강시우", email: "siwoo***@gmail.com", role: "customer", status: "정상" },
];
const SAMPLE_SELLER_APPS = [
  { businessName: "성수 수제버거 키친", businessNumber: "123-45-67890", appliedAt: "오늘" },
  { businessName: "서울숲 꽃집 블룸", businessNumber: "234-56-78901", appliedAt: "어제" },
  { businessName: "뚝섬 정육점", businessNumber: "345-67-89012", appliedAt: "2일 전" },
];
const SAMPLE_PRODUCTS = [
  { name: "[성수 베이커리] 우유 생크림 롤케이크", status: "pending_review" },
  { name: "[성수 수제버거 키친] 더블 치즈버거 세트", status: "pending_review" },
  { name: "산지직송 당도보장 논산 딸기 2팩", status: "active" },
  { name: "성수동 맛집 30년 전통 수제 모둠 순대", status: "active" },
  { name: "당일 산란 신선한 특란 30구 (1판)", status: "active" },
  { name: "[테스트] 가격 오입력 상품", status: "hidden" },
];
const productStatusLabel: Record<string, string> = { pending_review: "검수 중", active: "운영", hidden: "숨김" };
const demoAction = () => toast("데모 화면에서는 실제로 동작하지 않아요. 진짜 관리자 계정으로 이용해 보세요!");

function DashboardTab() {
  const metrics: Array<[string, string | number]> = [
    ["전체 사용자", 1204],
    ["활성 판매자", 38],
    ["오늘 주문", 156],
    ["답변 대기 문의", 5],
  ];
  return (
    <>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <span><ShieldCheck /></span>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="dashboard-panel spaced-panel">
        <div className="panel-title-row">
          <div><p>RECENT ACTIVITY</p><h2>최근 운영 이력</h2></div>
        </div>
        <div className="operation-list">
          <div className="compact-row"><span>판매자 신청이 도착했어요 · 성수 수제버거 키친</span><small>10분 전</small></div>
          <div className="compact-row"><span>상품 검수 요청 · 우유 생크림 롤케이크</span><small>40분 전</small></div>
          <div className="compact-row"><span>1:1 문의 답변 완료 · 픽업 시간 변경 문의</span><small>1시간 전</small></div>
          <div className="compact-row"><span>신고된 커뮤니티 글 숨김 처리</span><small>2시간 전</small></div>
          <div className="compact-row"><span>판매자 승인 · 서울숲 꽃집 블룸</span><small>어제</small></div>
        </div>
      </section>
    </>
  );
}

function UsersTab() {
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>USER MANAGEMENT</p><h2>사용자 관리</h2></div></div>
      <div className="operation-list">
        {SAMPLE_USERS.map((user) => (
          <article className="compact-row" key={user.email}>
            <span><b>{user.name}</b><small>{user.email} · {user.role === "seller" ? "판매자" : "일반회원"}</small></span>
            <div className="action-row">
              <StatusBadge type={user.status === "정상" ? "live" : "ready"}>{user.status}</StatusBadge>
              <button onClick={demoAction}>{user.status === "정상" ? "정지" : "정지 해제"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SellersTab() {
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>SELLER APPLICATIONS</p><h2>판매자 신청</h2></div></div>
      <div className="operation-list">
        {SAMPLE_SELLER_APPS.map((app) => (
          <article className="operation-card" key={app.businessNumber}>
            <header>
              <div><strong>{app.businessName}</strong><small>사업자번호 {app.businessNumber} · {app.appliedAt} 신청</small></div>
              <StatusBadge type="ready">승인 대기</StatusBadge>
            </header>
            <div className="action-row"><button onClick={demoAction}>승인</button><button onClick={demoAction}>반려</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductsTab() {
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>PRODUCT MODERATION</p><h2>상품 검수</h2></div></div>
      <div className="operation-list">
        {SAMPLE_PRODUCTS.map((item) => (
          <article className="compact-row" key={item.name}>
            <span><b>{item.name}</b></span>
            <div className="action-row">
              <StatusBadge type={item.status === "active" ? "live" : item.status === "hidden" ? "mock" : "ready"}>{productStatusLabel[item.status]}</StatusBadge>
              <button onClick={demoAction}>승인</button>
              <button onClick={demoAction}>숨김</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AdminDemoPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <img src="/images/deal-logo.png" alt="타임딜" className="dashboard-brand-logo" />
          <small>관리자 콘솔 데모</small>
        </Link>
        <div className="dashboard-role">
          <StatusBadge type="mock">데모 데이터</StatusBadge>
          <p>로그인 없이 둘러보는 데모 화면이에요. 실제 관리자 콘솔과 같은 구성이에요.</p>
        </div>
        <nav aria-label="관리자 콘솔 데모 메뉴">
          {TABS.map(([key, label, Icon]) => (
            <a key={key} href="#" className={tab === key ? "active" : ""} onClick={(event) => { event.preventDefault(); setTab(key); }}>
              <Icon size={18} /><span>{label}</span>
            </a>
          ))}
        </nav>
        <Link to="/" className="back-home"><ArrowLeft size={17} /> 고객 사이트로</Link>
      </aside>
      <div className="dashboard-main">
        <header>
          <div><p>ADMIN OPERATIONS · DEMO</p><strong>관리자 콘솔 데모</strong></div>
        </header>
        <main>
          <div className="dashboard-page-heading">
            <div><p>관리자 기능 데모</p><h1>{TABS.find(([key]) => key === tab)?.[1]}</h1><span>실제 관리자 콘솔과 같은 화면 구성을 로그인 없이 확인해 보세요.</span></div>
          </div>
          <div className="dashboard-content">
            {tab === "dashboard" && <DashboardTab />}
            {tab === "users" && <UsersTab />}
            {tab === "sellers" && <SellersTab />}
            {tab === "products" && <ProductsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
