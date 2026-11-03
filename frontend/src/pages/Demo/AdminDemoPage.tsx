/**
 * 로그인 없이 관리자 콘솔의 화면 구성을 둘러볼 수 있는 데모입니다.
 * 모든 데이터는 샘플이며, 버튼은 이 화면 안에서만 바뀌고 서버에는 아무것도 저장하지 않습니다.
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
const demoSaved = (message: string) => toast.success(`${message} (데모라 저장되지는 않아요)`);
const showInquiry = () => toast("1:1 문의 · 최** 님 \"픽업 시간을 오후 7시에서 8시로 바꿀 수 있을까요?\"", { description: "답변 완료 · 판매자 확인 후 8시로 변경해 드렸어요.", duration: 6000 });
const showOrders = () => toast("오늘 주문 156건", { description: "픽업 완료 121건 · 픽업 대기 31건 · 취소 4건", duration: 5000 });
const showReport = () => toast("신고 사유: 광고성 게시글 (외부 링크 반복 게시)", { description: "신고 3건 접수 → 운영 정책에 따라 숨김 처리했어요.", duration: 6000 });

function DashboardTab({ onGo }: { onGo: (tab: Tab) => void }) {
  const metrics: Array<[string, string | number, () => void]> = [
    ["전체 사용자", 1204, () => onGo("users")],
    ["활성 판매자", 38, () => onGo("sellers")],
    ["오늘 주문", 156, showOrders],
    ["답변 대기 문의", 5, showInquiry],
  ];
  const activities: Array<[string, string, () => void]> = [
    ["판매자 신청이 도착했어요 · 성수 수제버거 키친", "10분 전", () => onGo("sellers")],
    ["상품 검수 요청 · 우유 생크림 롤케이크", "40분 전", () => onGo("products")],
    ["1:1 문의 답변 완료 · 픽업 시간 변경 문의", "1시간 전", showInquiry],
    ["신고된 커뮤니티 글 숨김 처리", "2시간 전", showReport],
    ["판매자 승인 · 서울숲 꽃집 블룸", "어제", () => onGo("sellers")],
  ];
  return (
    <>
      <div className="metric-grid">
        {metrics.map(([label, value, onClick]) => (
          <article key={label} onClick={onClick} style={{ cursor: "pointer" }}>
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
          {activities.map(([text, time, onClick]) => (
            <div className="compact-row" key={text} onClick={onClick} style={{ cursor: "pointer" }}><span>{text}</span><small>{time}</small></div>
          ))}
        </div>
      </section>
    </>
  );
}

function UsersTab() {
  const [users, setUsers] = useState(SAMPLE_USERS);
  const toggle = (email: string) => {
    const user = users.find((item) => item.email === email);
    if (!user) return;
    const next = user.status === "정상" ? "정지" : "정상";
    setUsers((prev) => prev.map((item) => (item.email === email ? { ...item, status: next } : item)));
    demoSaved(next === "정지" ? `${user.name} 님을 이용 정지했어요.` : `${user.name} 님의 정지를 해제했어요.`);
  };
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>USER MANAGEMENT</p><h2>사용자 관리</h2></div></div>
      <div className="operation-list">
        {users.map((user) => (
          <article className="compact-row" key={user.email}>
            <span><b>{user.name}</b><small>{user.email} · {user.role === "seller" ? "판매자" : "일반회원"}</small></span>
            <div className="action-row">
              <StatusBadge type={user.status === "정상" ? "live" : "ready"}>{user.status}</StatusBadge>
              <button onClick={() => toggle(user.email)}>{user.status === "정상" ? "정지" : "정지 해제"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SellersTab() {
  const [decisions, setDecisions] = useState<Record<string, "승인" | "반려">>({});
  const decide = (name: string, decision: "승인" | "반려") => {
    setDecisions((prev) => ({ ...prev, [name]: decision }));
    demoSaved(`${name} 판매자 신청을 ${decision}했어요.`);
  };
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>SELLER APPLICATIONS</p><h2>판매자 신청</h2></div></div>
      <div className="operation-list">
        {SAMPLE_SELLER_APPS.map((app) => (
          <article className="operation-card" key={app.businessNumber}>
            <header>
              <div><strong>{app.businessName}</strong><small>사업자번호 {app.businessNumber} · {app.appliedAt} 신청</small></div>
              <StatusBadge type={decisions[app.businessName] === "승인" ? "live" : decisions[app.businessName] ? "mock" : "ready"}>{decisions[app.businessName] ?? "승인 대기"}</StatusBadge>
            </header>
            {!decisions[app.businessName] && <div className="action-row"><button onClick={() => decide(app.businessName, "승인")}>승인</button><button onClick={() => decide(app.businessName, "반려")}>반려</button></div>}
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const setStatus = (name: string, status: string) => {
    setProducts((prev) => prev.map((item) => (item.name === name ? { ...item, status } : item)));
    demoSaved(`${name} 상품을 ${productStatusLabel[status]} 상태로 바꿨어요.`);
  };
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>PRODUCT MODERATION</p><h2>상품 검수</h2></div></div>
      <div className="operation-list">
        {products.map((item) => (
          <article className="compact-row" key={item.name}>
            <span><b>{item.name}</b></span>
            <div className="action-row">
              <StatusBadge type={item.status === "active" ? "live" : item.status === "hidden" ? "mock" : "ready"}>{productStatusLabel[item.status]}</StatusBadge>
              {item.status !== "active" && <button onClick={() => setStatus(item.name, "active")}>승인</button>}
              {item.status !== "hidden" && <button onClick={() => setStatus(item.name, "hidden")}>숨김</button>}
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
            {tab === "dashboard" && <DashboardTab onGo={setTab} />}
            {tab === "users" && <UsersTab />}
            {tab === "sellers" && <SellersTab />}
            {tab === "products" && <ProductsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
