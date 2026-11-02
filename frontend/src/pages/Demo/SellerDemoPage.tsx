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
  { name: "[성수 베이커리] 명품 버터 소금빵 4개 세트", price: 7900, stock: 18, status: "판매중" },
  { name: "[성수 베이커리] 모닝 식빵·모닝빵 세트", price: 10100, stock: 9, status: "판매중" },
  { name: "[성수 베이커리] 오늘의 베이글 3종", price: 14800, stock: 6, status: "판매중" },
  { name: "[성수 베이커리] 수제 쿠키·스콘 박스", price: 7500, stock: 0, status: "품절" },
  { name: "[성수 베이커리] 계절 과일 타르트 (홀)", price: 26000, stock: 3, status: "판매중" },
  { name: "[성수 베이커리] 우유 생크림 롤케이크", price: 12900, stock: 12, status: "검수 대기" },
];
const SAMPLE_ORDERS = [
  { id: "TD-20F3B41", product: "명품 버터 소금빵 4개 세트 × 2", customer: "김**", amount: 15800, status: "접수", pickup: "오늘 07:30 · GS25 성수이로점" },
  { id: "TD-20F3B3E", product: "오늘의 베이글 3종", customer: "이**", amount: 14800, status: "픽업 준비", pickup: "오늘 08:00 · CU 왕십리점" },
  { id: "TD-20F3B3A", product: "모닝 식빵·모닝빵 세트", customer: "박**", amount: 10100, status: "픽업 준비", pickup: "오늘 08:30 · GS25 성수이로점" },
  { id: "TD-20F3B37", product: "계절 과일 타르트 (홀)", customer: "최**", amount: 26000, status: "접수", pickup: "오늘 18:00 · 홈플러스 익스프레스 서울숲점" },
  { id: "TD-20F3B2F", product: "명품 버터 소금빵 4개 세트", customer: "정**", amount: 7900, status: "완료", pickup: "어제 07:40 · 세븐일레븐 뚝섬점" },
  { id: "TD-20F3B2C", product: "수제 쿠키·스콘 박스 × 3", customer: "강**", amount: 22500, status: "완료", pickup: "어제 19:10 · 이마트 성수점" },
];
const demoAction = () => toast("데모 화면에서는 실제로 동작하지 않아요. 진짜 판매자 센터에서 이용해 보세요!");

function DashboardTab() {
  const metrics: Array<[string, string | number]> = [
    ["판매 중 상품", 5],
    ["오늘 픽업 대기", 4],
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
          <div><p>RECENT ACTIVITY</p><h2>최근 활동</h2></div>
        </div>
        <div className="operation-list">
          <div className="compact-row"><span>새 예약이 들어왔어요 · 명품 버터 소금빵 4개 세트 × 2</span><small>3분 전</small></div>
          <div className="compact-row"><span>픽업이 완료됐어요 · 오늘의 베이글 3종</span><small>26분 전</small></div>
          <div className="compact-row"><span>재입고 요청 7건이 모였어요 · 수제 쿠키·스콘 박스</span><small>1시간 전</small></div>
          <div className="compact-row"><span>고객 문의가 도착했어요 · 타르트에 생일 문구 넣을 수 있나요?</span><small>2시간 전</small></div>
          <div className="compact-row"><span>마감 임박 자동 할인이 적용됐어요 · 우유 생크림 롤케이크 −10%</span><small>3시간 전</small></div>
        </div>
      </section>
    </>
  );
}

function ProductsTab() {
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div><p>PRODUCT MANAGEMENT</p><h2>상품 관리</h2></div>
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
        <div><p>FULFILLMENT</p><h2>주문 현황</h2></div>
      </div>
      <div className="operation-list">
        {SAMPLE_ORDERS.map((item) => (
          <article className="operation-card" key={item.id}>
            <header>
              <div><strong>{item.product}</strong><small>주문 {item.id} · {item.customer}님 · {formatPrice(item.amount)} · 픽업 {item.pickup}</small></div>
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
          <p>로그인 없이 둘러보는 데모 화면이에요. 가상의 가게 성수 베이커리의 하루를 보여드려요.</p>
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
            <div><p>판매자 기능 데모</p><h1>{TABS.find(([key]) => key === tab)?.[1]}</h1><span>실제 판매자 센터와 같은 화면 구성을 로그인 없이 확인해 보세요.</span></div>
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
