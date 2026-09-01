/**
 * 로그인 없이 판매자 센터의 화면 구성을 둘러볼 수 있는 데모입니다.
 * 모든 데이터는 샘플이며, 버튼은 실제로 아무것도 변경하지 않습니다.
 */
import { useState } from "react";
import { ArrowLeft, BarChart3, Boxes, ClipboardList, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatPrice } from "@/shared/catalog";

const TABS = [
  ["dashboard", "대시보드", BarChart3],
  ["products", "상품 관리", Boxes],
  ["orders", "주문 현황", ClipboardList],
] as const;
type Tab = (typeof TABS)[number][0];

const SAMPLE_PRODUCTS = [
  { name: "[성수 베이커리] 당일 식빵 2개", price: 6900, stock: 12, status: "판매중" },
  { name: "[성수정육점] 한우 불고기 500g", price: 15900, stock: 4, status: "판매중" },
  { name: "[동네과일가게] 완숙 토마토 1kg", price: 4900, stock: 0, status: "품절" },
  { name: "[성수반찬가게] 오늘의 밑반찬 세트", price: 8900, stock: 20, status: "검수 대기" },
];
const SAMPLE_ORDERS = [
  { id: "DEMO-1042", product: "당일 식빵 2개", customer: "김**", amount: 6900, status: "픽업 준비" },
  { id: "DEMO-1041", product: "한우 불고기 500g", customer: "이**", amount: 15900, status: "완료" },
  { id: "DEMO-1040", product: "오늘의 밑반찬 세트", customer: "박**", amount: 8900, status: "접수" },
];
const demoAction = () => toast("데모 화면에서는 실제로 동작하지 않아요. 진짜 판매자 센터에서 이용해 보세요!");

function DashboardTab() {
  const metrics: Array<[string, string | number]> = [
    ["등록 상품", 12],
    ["처리 대기 fulfillment", 3],
    ["이번 달 예약 금액", formatPrice(1284000)],
    ["답변 대기 문의", 2],
  ];
  return (
    <>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <span><TrendingUp /></span>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="dashboard-panel spaced-panel">
        <div className="panel-title-row">
          <div><p>SAMPLE ACTIVITY</p><h2>최근 활동 (샘플)</h2></div>
        </div>
        <div className="operation-list">
          <div className="compact-row"><span>새 주문이 접수됐어요 · 당일 식빵 2개</span><small>3분 전</small></div>
          <div className="compact-row"><span>재입고 요청이 도착했어요 · 완숙 토마토 1kg</span><small>1시간 전</small></div>
          <div className="compact-row"><span>고객 문의에 답변이 필요해요</span><small>2시간 전</small></div>
        </div>
      </section>
    </>
  );
}

function ProductsTab() {
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div><p>PRODUCT MANAGEMENT</p><h2>상품 관리 (샘플)</h2></div>
        <button className="primary-button" onClick={demoAction}>상품 등록</button>
      </div>
      <div className="operation-list">
        {SAMPLE_PRODUCTS.map((item) => (
          <article className="compact-row" key={item.name}>
            <span><b>{item.name}</b><small>{formatPrice(item.price)} · 재고 {item.stock}개</small></span>
            <div className="action-row">
              <StatusBadge type={item.status === "판매중" ? "live" : item.status === "품절" ? "ready" : "mock"}>{item.status}</StatusBadge>
              <button onClick={demoAction}>수정</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OrdersTab() {
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div><p>FULFILLMENT</p><h2>주문 현황 (샘플)</h2></div>
      </div>
      <div className="operation-list">
        {SAMPLE_ORDERS.map((item) => (
          <article className="operation-card" key={item.id}>
            <header>
              <div><strong>{item.product}</strong><small>주문 {item.id} · {item.customer}님 · {formatPrice(item.amount)}</small></div>
              <StatusBadge type={item.status === "완료" ? "live" : item.status === "픽업 준비" ? "ready" : "mock"}>{item.status}</StatusBadge>
            </header>
            {item.status !== "완료" && <div className="action-row"><button onClick={demoAction}>다음 단계로</button></div>}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function SellerDemoPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <img src="/images/deal-logo.png" alt="타임딜" className="dashboard-brand-logo" />
          <small>판매자 센터 데모</small>
        </Link>
        <div className="dashboard-role">
          <StatusBadge type="mock">데모 데이터</StatusBadge>
          <p>로그인 없이 둘러보는 샘플 화면입니다. 실제 데이터가 아니에요.</p>
        </div>
        <nav aria-label="판매자 센터 데모 메뉴">
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
          <div><p>SELLER OPERATIONS · DEMO</p><strong>판매자 센터 데모</strong></div>
          <Link to="/mypage/seller-application" className="secondary-button">실제로 판매자 신청하기</Link>
        </header>
        <main>
          <div className="dashboard-page-heading">
            <div><p>판매자 기능 데모</p><h1>{TABS.find(([key]) => key === tab)?.[1]}</h1><span>실제 판매자 센터와 같은 화면 구성을, 로그인 없이 샘플 데이터로 확인해 보세요.</span></div>
          </div>
          <div className="dashboard-content">
            {tab === "dashboard" && <DashboardTab />}
            {tab === "products" && <ProductsTab />}
            {tab === "orders" && <OrdersTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
