/**
 * 로그인 사용자의 프로필·참여 딜·주문·리뷰·문의·보안 설정을 실제 API로 관리하는 계정 화면입니다.
 * 주문 내역 상품에서 바로 재입고 요청을 전송할 수 있으며, 서버 검증을 통해 관리됩니다.
 */
import {
  ChevronDown,
  ChevronUp,
  Gavel,
  KeyRound,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  PackageCheck,
  PackagePlus,
  Send,
  ShieldCheck,
  Star,
  Store,
  TimerReset,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  applySellerAccount,
  cancelMyOrder,
  confirmAuctionReceipt,
  createMyReview,
  createRestockRequest,
  deleteMyReview,
  getMyAuctionOrders,
  getMyInquiries,
  getMyOrder,
  getMyOrders,
  getMyParticipations,
  getMyProfile,
  getMyRestockRequests,
  getMyReviews,
  getMySellerApplication,
  replyMyInquiry,
  updateMyProfile,
  updateMyReview,
  type Inquiry,
  type Order,
  type RawRecord,
} from "@/lib/api";
import { authClient, clearAuthToken } from "@/lib/auth";
import { isSupabaseAuthConfigured, supabaseAuthClient } from "@/lib/supabase-auth";
import { formatPrice } from "@/shared/catalog";

const menu = [
  ["/mypage", "내 정보", UserRound],
  ["/mypage/deals", "참여 딜", TimerReset],
  ["/mypage/orders", "주문", PackageCheck],
  ["/mypage/auctions", "낙찰 내역", Gavel],
  ["/mypage/restock-requests", "재입고 요청", PackagePlus],
  ["/mypage/reviews", "나의 리뷰", Star],
  ["/mypage/inquiries", "나의 문의", MessageSquareText],
  ["/mypage/seller-application", "판매자 신청", Store],
  ["/mypage/security", "보안 및 로그인 관리", KeyRound],
] as const;

const details: Record<string, [string, string]> = {
  "/mypage": ["내 정보", "이름·전화번호·관심 지역·마케팅 수신을 관리합니다."],
  "/mypage/deals": ["참여 딜", "주문으로 확정된 공동구매 참여 현황을 확인합니다."],
  "/mypage/orders": ["주문", "픽업 장소·슬롯과 현장 결제 또는 예약 주문 상태를 확인합니다."],
  "/mypage/auctions": ["낙찰 내역", "직판장 경매 낙찰 건의 에스크로·수령 상태를 확인합니다."],
  "/mypage/restock-requests": ["재입고 요청", "주문했던 상품의 재입고를 요청하고 판매자 답변을 확인합니다."],
  "/mypage/reviews": ["나의 리뷰", "수령 완료 주문 상품의 리뷰를 작성·수정·삭제합니다."],
  "/mypage/inquiries": ["나의 문의", "고객센터 문의 대화를 확인하고 메시지를 추가합니다."],
  "/mypage/seller-application": ["판매자 신청", "사업자 정보를 제출하면 관리자 승인 후 판매자 센터가 열립니다."],
  "/mypage/security": ["보안 및 로그인 관리", "비밀번호를 변경하고 로그인된 기기를 관리합니다."],
};

const auctionOrderStatusLabel: Record<string, string> = {
  escrow_hold: "에스크로 보관중",
  completed: "구매 확정 완료",
  payment_pending: "결제 대기",
  live: "경매중",
};
const deliveryMethodLabel: Record<string, string> = {
  PICKUP: "현장 직접 수령",
  PARCEL: "산지 직송 택배",
  QUICK: "당일 특급 퀵",
};
const sellerApplicationStatusLabel: Record<string, string> = {
  pending: "심사 대기 중",
  approved: "승인 완료",
  rejected: "반려됨",
};
const orderStatusLabel: Record<string, string> = {
  pending: "주문 접수",
  confirmed: "주문 확인",
  ready: "픽업 준비",
  completed: "수령 완료",
  cancelled: "주문 취소",
};
const pickupStatusLabel: Record<string, string> = {
  pending: "픽업 대기",
  ready: "픽업 가능",
  collected: "수령 완료",
  no_show: "미수령",
  cancelled: "픽업 취소",
};
const paymentStatusLabel: Record<string, string> = {
  not_applicable: "결제 없는 예약",
  pay_on_pickup: "현장 결제 예정",
  pending_payment: "카드 결제 대기",
  paid: "카드 결제 완료",
  payment_failed: "카드 결제 실패",
  refunded: "환불 완료",
};

const str = (item: RawRecord, key: string) => String(item[key] ?? "");
const num = (item: RawRecord, key: string) => Number(item[key] ?? 0);
const date = (input?: string) =>
  input
    ? new Date(input).toLocaleString("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {notice && <div className="order-notice">{notice}</div>}
      {error && (
        <div className="order-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="order-loading">
      <LoaderCircle className="spin-icon" /> {text}
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state compact-empty">
      <PackageCheck size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ProfilePanel({ onName }: { onName: (name: string) => void }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferredRegion: "",
    marketingOptIn: false,
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getMyProfile()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data)
          return setError(result.error?.message ?? "프로필을 조회하지 못했습니다.");
        const profile = result.data.profile;
        const next = {
          name: str(profile, "name"),
          phone: str(profile, "phone"),
          preferredRegion: str(profile, "preferred_region"),
          marketingOptIn: Boolean(profile.marketing_opt_in),
        };
        setForm(next);
        setEmail(str(profile, "email"));
        setRole(str(profile, "role"));
        setVerified(Boolean(profile.emailVerified));
        onName(next.name);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [onName]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await updateMyProfile(form);
    setBusy(false);
    if (!result.ok) return setError(result.error?.message ?? "프로필을 저장하지 못했습니다.");
    setNotice("프로필 설정을 저장했습니다.");
    onName(form.name);
  };

  if (loading) return <Loading text="프로필을 불러오는 중입니다." />;
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div>
          <p>PROFILE</p>
          <h2>회원 정보</h2>
        </div>
        <StatusBadge type="live">프로필 API</StatusBadge>
      </div>
      <Feedback error={error} notice={notice} />
      <div className="profile-grid compact-profile">
        <article>
          <span>이메일</span>
          <strong>{email}</strong>
          <small>{verified ? "인증 완료" : "이메일 인증 필요"}</small>
        </article>
        <article>
          <span>회원 역할</span>
          <strong>{role || "user"}</strong>
          <small>권한은 서버에서 검증합니다.</small>
        </article>
      </div>
      <form className="operation-form spaced-panel" onSubmit={save}>
        <label>
          이름
          <input
            required
            minLength={2}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          전화번호
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </label>
        <label>
          관심 지역
          <input
            value={form.preferredRegion}
            onChange={(event) =>
              setForm({ ...form, preferredRegion: event.target.value })
            }
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={form.marketingOptIn}
            onChange={(event) =>
              setForm({ ...form, marketingOptIn: event.target.checked })
            }
          />{" "}
          마케팅 정보 수신
        </label>
        <button className="primary-button" disabled={busy}>
          {busy && <LoaderCircle className="spin-icon" size={15} />}저장
        </button>
      </form>
    </section>
  );
}

function SellerApplicationPanel() {
  const [application, setApplication] = useState<RawRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ businessName: "", businessNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMySellerApplication();
    setLoading(false);
    if (result.ok) setApplication(result.data?.application ?? null);
    else setError(result.error?.message ?? "판매자 신청 상태를 조회하지 못했습니다.");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await applySellerAccount(form);
    setBusy(false);
    if (!result.ok)
      return setError(result.error?.message ?? "판매자 신청을 접수하지 못했습니다.");
    setNotice(
      "판매자 신청이 접수되었습니다. 관리자 승인 후 판매자 센터를 이용할 수 있습니다."
    );
    setForm({ businessName: "", businessNumber: "" });
    await load();
  };

  if (loading) return <Loading text="판매자 신청 상태를 불러오는 중입니다." />;
  const status = application ? str(application, "status") : null;

  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div>
          <p>SELLER APPLICATION</p>
          <h2>판매자 신청</h2>
        </div>
        {status && (
          <StatusBadge type={status === "approved" ? "live" : "ready"}>
            {sellerApplicationStatusLabel[status] ?? status}
          </StatusBadge>
        )}
      </div>
      <Feedback error={error} notice={notice} />
      {status === "approved" ? (
        <>
          <p className="muted-copy">
            승인된 판매자 계정입니다. 판매자 센터에서 상품·딜·주문을 관리하세요.
          </p>
          <Link className="primary-button" to="/seller">
            판매자 센터로 이동
          </Link>
        </>
      ) : status === "pending" ? (
        <div className="operation-card">
          <header>
            <div>
              <strong>{str(application!, "business_name")}</strong>
              <small>사업자등록번호 {str(application!, "business_number")}</small>
            </div>
          </header>
          <p className="muted-copy">
            관리자가 신청을 검토하고 있습니다. 승인되면 판매자 센터가 자동으로 열립니다.
          </p>
        </div>
      ) : (
        <>
          {status === "rejected" && (
            <div className="order-error" role="alert">
              반려 사유: {str(application!, "review_reason") || "사유가 등록되지 않았습니다."}
            </div>
          )}
          <form className="operation-form" onSubmit={submit}>
            <label>
              사업자명
              <input
                required
                minLength={2}
                value={form.businessName}
                onChange={(event) =>
                  setForm({ ...form, businessName: event.target.value })
                }
              />
            </label>
            <label>
              사업자등록번호
              <input
                required
                placeholder="000-00-00000"
                value={form.businessNumber}
                onChange={(event) =>
                  setForm({ ...form, businessNumber: event.target.value })
                }
              />
            </label>
            <button className="primary-button" disabled={busy}>
              {busy && <LoaderCircle className="spin-icon" size={15} />}
              {status === "rejected" ? "다시 신청" : "판매자 신청"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function ParticipationsPanel() {
  const [items, setItems] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getMyParticipations()
      .then((result) =>
        result.ok
          ? setItems(result.data?.participations ?? [])
          : setError(result.error?.message ?? "참여 딜을 조회하지 못했습니다.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="참여 딜을 불러오는 중입니다." />;
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div>
          <p>PARTICIPATIONS</p>
          <h2>참여 딜</h2>
        </div>
        <StatusBadge type="live">주문 기반</StatusBadge>
      </div>
      <Feedback error={error} notice={null} />
      {items.length === 0 ? (
        <Empty title="참여한 딜이 없습니다." text="상품 주문 후 참여 내역이 표시됩니다." />
      ) : (
        <div className="operation-list">
          {items.map((item) => {
            const deal = (item.deals ?? {}) as RawRecord;
            const product = (deal.products ?? {}) as RawRecord;
            return (
              <article className="operation-card" key={str(item, "id")}>
                <header>
                  <div>
                    <strong>{str(product, "name") || "타임딜"}</strong>
                    <small>
                      {num(item, "quantity")}개 참여 · {date(str(item, "created_at"))}
                    </small>
                  </div>
                  <StatusBadge
                    type={str(item, "status") === "cancelled" ? "ready" : "live"}
                  >
                    {str(item, "status")}
                  </StatusBadge>
                </header>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (num(deal, "participants") /
                            Math.max(1, num(deal, "target"))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── 주문 상세 카드 (상품별 재입고 요청 버튼 탑재) ──
function OrderCard({
  order,
  expanded,
  onToggle,
  onCancel,
  cancelling,
  requestedProductIds,
  onRestockRequest,
  restockingId,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
  cancelling: boolean;
  requestedProductIds: Set<string>;
  onRestockRequest: (orderItemId: string, productId: string, productName: string) => void;
  restockingId: string | null;
}) {
  const [detail, setDetail] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!expanded || detail) return;
    setLoadingDetail(true);
    void getMyOrder(order.id)
      .then((result) => {
        if (result.ok) setDetail(result.data?.order ?? order);
      })
      .finally(() => setLoadingDetail(false));
  }, [detail, expanded, order]);

  const current = detail ?? order;
  const canCancel = ["pending", "confirmed", "ready"].includes(current.orderStatus);

  return (
    <article className="order-card">
      <button
        type="button"
        className="order-card-summary"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div>
          <span className="order-number">{current.orderNumber}</span>
          <strong>
            {current.order_items?.[0]?.productName ?? "타임딜 주문"}
            {(current.order_items?.length ?? 0) > 1
              ? ` 외 ${current.order_items!.length - 1}건`
              : ""}
          </strong>
          <small>{date(current.createdAt)}</small>
        </div>
        <div className="order-card-status">
          <StatusBadge
            type={current.orderStatus === "cancelled" ? "ready" : "live"}
          >
            {orderStatusLabel[current.orderStatus] ?? current.orderStatus}
          </StatusBadge>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {expanded && (
        <div className="order-card-detail">
          {loadingDetail ? (
            <Loading text="주문 상세를 불러오는 중입니다." />
          ) : (
            <>
              <div className="order-detail-grid">
                <div>
                  <span>픽업 장소 ID</span>
                  <strong>
                    <MapPin size={15} />
                    {current.pickupLocationId}
                  </strong>
                </div>
                <div>
                  <span>수령 슬롯 ID</span>
                  <strong>{current.pickupSlotId}</strong>
                </div>
                <div>
                  <span>픽업 상태</span>
                  <strong>
                    {pickupStatusLabel[current.pickupStatus] ?? current.pickupStatus}
                  </strong>
                </div>
                <div>
                  <span>결제 상태</span>
                  <strong>
                    {paymentStatusLabel[current.paymentStatus] ?? current.paymentStatus}
                  </strong>
                </div>
                {current.deliveryAddress && (
                  <div>
                    <span>수령 주소</span>
                    <strong>
                      <MapPin size={15} />
                      {current.deliveryAddress}
                    </strong>
                  </div>
                )}
              </div>

              {/* 💡 주문 상품 목록 및 재입고 요청 버튼 연동 */}
              <div className="order-items" style={{ marginTop: "16px" }}>
                <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "8px" }}>
                  주문 상품 목록
                </span>
                {(current.order_items ?? []).map((item) => {
                  const itemId = item.id ?? item.productId ?? "";
                  const pId = item.productId ?? "";
                  const isRequested = requestedProductIds.has(pId);
                  const isBusy = restockingId === itemId;

                  return (
                    <div
                      key={itemId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div>
                        <strong style={{ display: "block", fontSize: "14px", color: "#222" }}>
                          {item.productName}
                        </strong>
                        <small style={{ color: "#666" }}>
                          {item.quantity}개 · {formatPrice(item.lineTotal)}
                        </small>
                      </div>

                      <div>
                        {isRequested ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              color: "#2e7d32",
                              fontWeight: 600,
                              background: "#e8f5e9",
                              padding: "4px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            <CheckCircle2 size={13} /> 요청 완료
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isBusy}
                            onClick={() => onRestockRequest(itemId, pId, item.productName)}
                            style={{
                              fontSize: "12px",
                              padding: "5px 10px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              cursor: "pointer",
                            }}
                          >
                            {isBusy ? (
                              <LoaderCircle className="spin-icon" size={13} />
                            ) : (
                              <PackagePlus size={13} />
                            )}
                            재입고 요청
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="order-total" style={{ marginTop: "14px" }}>
                <span>주문 금액</span>
                <strong>{formatPrice(current.totalAmount)}</strong>
              </div>

              {canCancel && (
                <button
                  className="secondary-button cancel-button"
                  disabled={cancelling}
                  onClick={onCancel}
                >
                  {cancelling ? "취소 중" : "주문 취소"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function OrdersPanel() {
  const [items, setItems] = useState<Order[]>([]);
  const [requestedProductIds, setRequestedProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, requestsRes] = await Promise.all([
      getMyOrders(),
      getMyRestockRequests(),
    ]);
    setLoading(false);

    if (ordersRes.ok) setItems(ordersRes.data?.orders ?? []);
    else setError(ordersRes.error?.message ?? "주문을 조회하지 못했습니다.");

    if (requestsRes.ok) {
      const ids = new Set(
        (requestsRes.data?.requests ?? []).map((r) => str(r, "product_id"))
      );
      setRequestedProductIds(ids);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (id: string) => {
    if (!window.confirm("주문을 취소할까요?")) return;
    setBusy(id);
    const result = await cancelMyOrder(id);
    setBusy(null);
    if (!result.ok) return setError(result.error?.message ?? "주문을 취소하지 못했습니다.");
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, orderStatus: "cancelled", pickupStatus: "cancelled" }
          : item
      )
    );
    setNotice("주문을 취소했습니다. 실제 온라인 결제가 없으므로 환불 처리는 발생하지 않습니다.");
  };

  const handleRestockRequest = async (
    orderItemId: string,
    productId: string,
    productName: string
  ) => {
    setRestockingId(orderItemId);
    setError(null);
    const result = await createRestockRequest(
      orderItemId,
      `[${productName}] 상품 재입고를 요청합니다.`
    );
    setRestockingId(null);

    if (!result.ok) {
      return setError(result.error?.message ?? "재입고 요청에 실패했습니다.");
    }

    setRequestedProductIds((prev) => new Set([...prev, productId]));
    setNotice(`[${productName}] 재입고 요청이 완료되었습니다! 마이페이지 > 재입고 요청 탭에서 답변을 확인하세요.`);
  };

  if (loading) return <Loading text="주문을 불러오는 중입니다." />;
  return (
    <section className="orders-panel">
      <div className="orders-panel-heading">
        <div>
          <p>MY ORDERS</p>
          <h2>주문 내역</h2>
        </div>
        <StatusBadge type="live">주문 API</StatusBadge>
      </div>
      <Feedback error={error} notice={notice} />
      {items.length === 0 ? (
        <Empty
          title="아직 주문이 없습니다."
          text="상품 상세에서 픽업 슬롯을 선택해 주문하세요."
        />
      ) : (
        <div className="order-list">
          {items.map((item) => (
            <OrderCard
              key={item.id}
              order={item}
              expanded={expanded === item.id}
              onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
              onCancel={() => void cancel(item.id)}
              cancelling={busy === item.id}
              requestedProductIds={requestedProductIds}
              onRestockRequest={handleRestockRequest}
              restockingId={restockingId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AuctionOrdersPanel() {
  const [items, setItems] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMyAuctionOrders();
    setLoading(false);
    if (result.ok) setItems(result.data?.orders ?? []);
    else setError(result.error?.message ?? "낙찰 내역을 조회하지 못했습니다.");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async (auctionId: string) => {
    if (
      !window.confirm(
        "물품을 정상 수령하셨나요? 확정 후에는 되돌릴 수 없습니다."
      )
    )
      return;
    setBusy(auctionId);
    const result = await confirmAuctionReceipt(auctionId);
    setBusy(null);
    if (!result.ok) return setError(result.error?.message ?? "구매 확정에 실패했습니다.");
    setNotice("구매를 확정했습니다. 정산은 최소 1일~최대 7영업일 이내 진행됩니다.");
    await load();
  };

  if (loading) return <Loading text="낙찰 내역을 불러오는 중입니다." />;
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div>
          <p>MY AUCTION WINS</p>
          <h2>낙찰 내역</h2>
        </div>
        <StatusBadge type="live">에스크로 연동</StatusBadge>
      </div>
      <Feedback error={error} notice={notice} />
      {items.length === 0 ? (
        <Empty
          title="낙찰 내역이 없습니다."
          text="직판장 경매에서 낙찰되면 여기에 표시됩니다."
        />
      ) : (
        <div className="operation-list">
          {items.map((item) => {
            const auction = (item.auction_items ?? {}) as RawRecord;
            const status = str(auction, "status");
            const confirmed = Boolean(item.buyer_confirmed_at);
            return (
              <article className="operation-card" key={str(item, "id")}>
                <header>
                  <div>
                    <strong>{str(auction, "title") || "경매 상품"}</strong>
                    <small>
                      {str(auction, "origin")} ·{" "}
                      {deliveryMethodLabel[str(item, "delivery_method")] ??
                        str(item, "delivery_method")}{" "}
                      · {formatPrice(num(item, "total_amount"))}
                    </small>
                  </div>
                  <StatusBadge type={confirmed ? "live" : "ready"}>
                    {confirmed
                      ? "구매 확정 완료"
                      : auctionOrderStatusLabel[status] ?? status}
                  </StatusBadge>
                </header>
                {!confirmed && status === "escrow_hold" && (
                  <div className="action-row">
                    <button
                      className="primary-button"
                      disabled={busy !== null}
                      onClick={() => void confirm(str(item, "auction_id"))}
                    >
                      {busy === str(item, "auction_id") ? (
                        <LoaderCircle className="spin-icon" size={15} />
                      ) : (
                        <ShieldCheck size={15} />
                      )}{" "}
                      물품 수령 완료 (구매 확정)
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RestockRequestsPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [orderResult, requestResult] = await Promise.all([
      getMyOrders(),
      getMyRestockRequests(),
    ]);
    setLoading(false);
    if (!orderResult.ok || !requestResult.ok) {
      setError("재입고 요청 정보를 불러오지 못했습니다.");
      return;
    }
    setOrders(orderResult.data?.orders ?? []);
    setRequests(requestResult.data?.requests ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eligibleProducts = (() => {
    const seen = new Map<string, { orderItemId: string; productName: string }>();
    for (const order of orders) {
      for (const item of order.order_items ?? []) {
        if (item.productId && item.id && !seen.has(item.productId)) {
          seen.set(item.productId, {
            orderItemId: item.id,
            productName: item.productName,
          });
        }
      }
    }
    return [...seen.entries()].map(([productId, value]) => ({
      productId,
      ...value,
    }));
  })();

  const requestByProduct = new Map(
    requests.map((request) => [str(request, "product_id"), request])
  );

  const send = async (orderItemId: string, productId: string) => {
    const message = messages[productId]?.trim() ?? "";
    setBusy(productId);
    setError(null);
    const result = await createRestockRequest(orderItemId, message);
    setBusy(null);
    if (!result.ok)
      return setError(result.error?.message ?? "재입고 요청을 보내지 못했습니다.");
    setNotice("재입고 요청을 보냈습니다. 판매자가 확인 후 답변합니다.");
    setOpenId(null);
    setMessages({ ...messages, [productId]: "" });
    await load();
  };

  if (loading) return <Loading text="재입고 요청 정보를 불러오는 중입니다." />;
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div>
          <p>RESTOCK REQUESTS</p>
          <h2>재입고 요청</h2>
        </div>
        <StatusBadge type="live">주문 기반</StatusBadge>
      </div>
      <Feedback error={error} notice={notice} />
      {eligibleProducts.length === 0 ? (
        <Empty
          title="요청 가능한 상품이 없습니다."
          text="주문한 상품에 한해 재입고를 요청할 수 있습니다."
        />
      ) : (
        <div className="operation-list">
          {eligibleProducts.map(({ productId, orderItemId, productName }) => {
            const request = requestByProduct.get(productId);
            return (
              <article className="operation-card" key={productId}>
                <header>
                  <div>
                    <strong>{productName}</strong>
                    {request && (
                      <small>{date(str(request, "created_at"))} 요청</small>
                    )}
                  </div>
                  {request && (
                    <StatusBadge
                      type={
                        str(request, "status") === "answered" ? "live" : "ready"
                      }
                    >
                      {str(request, "status") === "answered"
                        ? "판매자 답변 완료"
                        : "답변 대기 중"}
                    </StatusBadge>
                  )}
                </header>
                {request ? (
                  str(request, "status") === "answered" ? (
                    <div className="compact-row">
                      <span>
                        <b>판매자 답변</b>
                        <small>{str(request, "seller_reply")}</small>
                      </span>
                      {str(request, "expected_restock_date") && (
                        <strong>
                          예상 입고일 {str(request, "expected_restock_date")}
                        </strong>
                      )}
                    </div>
                  ) : (
                    <p className="muted-copy">판매자 확인을 기다리는 중입니다.</p>
                  )
                ) : openId === productId ? (
                  <div className="operation-form compact">
                    <label>
                      요청 메시지 (선택)
                      <textarea
                        rows={3}
                        value={messages[productId] ?? ""}
                        onChange={(event) =>
                          setMessages({
                            ...messages,
                            [productId]: event.target.value,
                          })
                        }
                        placeholder="이 상품이 좋아서 다시 나왔으면 좋겠어요!"
                      />
                    </label>
                    <div className="action-row">
                      <button
                        className="primary-button"
                        disabled={busy === productId}
                        onClick={() => void send(orderItemId, productId)}
                      >
                        {busy === productId ? "전송 중..." : "요청 보내기"}
                      </button>
                      <button
                        onClick={() => setOpenId(null)}
                        disabled={busy === productId}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="action-row">
                    <button onClick={() => setOpenId(productId)}>
                      <PackagePlus size={15} /> 재입고 요청
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewsPanel() {
  const [reviews, setReviews] = useState<RawRecord[]>([]);
  const [eligible, setEligible] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ orderItemId: "", rating: 5, content: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [reviewResult, orderResult] = await Promise.all([
      getMyReviews(),
      getMyOrders(),
    ]);
    if (!reviewResult.ok || !orderResult.ok)
      return setError("리뷰 정보를 불러오지 못했습니다.");
    const current = reviewResult.data?.reviews ?? [];
    setReviews(current);
    const used = new Set(current.map((item) => str(item, "order_item_id")));
    setEligible(
      (orderResult.data?.orders ?? [])
        .filter(
          (order) =>
            order.orderStatus === "completed" &&
            order.pickupStatus === "collected"
        )
        .flatMap((order) =>
          (order.order_items ?? [])
            .filter((item) => item.id && !used.has(item.id))
            .map((item) => ({ id: item.id!, name: item.productName }))
        )
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const result = await createMyReview(form);
    if (!result.ok) return setError(result.error?.message ?? "리뷰를 저장하지 못했습니다.");
    setNotice("리뷰를 작성했습니다.");
    setForm({ orderItemId: "", rating: 5, content: "" });
    await load();
  };

  const edit = async (item: RawRecord) => {
    const content = window.prompt("리뷰 내용", str(item, "content"));
    if (!content) return;
    const rating = Number(window.prompt("평점 1~5", String(num(item, "rating"))));
    const result = await updateMyReview(str(item, "id"), { content, rating });
    if (!result.ok) return setError(result.error?.message ?? "리뷰를 수정하지 못했습니다.");
    setNotice("리뷰를 수정했습니다.");
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("리뷰를 삭제할까요?")) return;
    const result = await deleteMyReview(id);
    if (!result.ok) return setError(result.error?.message ?? "리뷰를 삭제하지 못했습니다.");
    setNotice("리뷰를 삭제했습니다.");
    await load();
  };

  return (
    <>
      <Feedback error={error} notice={notice} />
      <section className="dashboard-panel">
        <div className="panel-title-row">
          <div>
            <p>WRITE REVIEW</p>
            <h2>수령 완료 상품 리뷰</h2>
          </div>
          <StatusBadge type="live">구매 자격 검증</StatusBadge>
        </div>
        {eligible.length > 0 ? (
          <form className="operation-form" onSubmit={create}>
            <label>
              상품
              <select
                required
                value={form.orderItemId}
                onChange={(event) =>
                  setForm({ ...form, orderItemId: event.target.value })
                }
              >
                <option value="">선택</option>
                {eligible.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              평점
              <select
                value={form.rating}
                onChange={(event) =>
                  setForm({ ...form, rating: Number(event.target.value) })
                }
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value}점
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              리뷰
              <textarea
                required
                minLength={2}
                value={form.content}
                onChange={(event) =>
                  setForm({ ...form, content: event.target.value })
                }
              />
            </label>
            <button className="primary-button">리뷰 작성</button>
          </form>
        ) : (
          <p className="muted-copy">현재 리뷰를 작성할 수 있는 수령 완료 상품이 없습니다.</p>
        )}
      </section>
      <section className="dashboard-panel spaced-panel">
        <div className="panel-title-row">
          <div>
            <p>MY REVIEWS</p>
            <h2>작성 리뷰</h2>
          </div>
        </div>
        {reviews.length === 0 ? (
          <Empty
            title="작성한 리뷰가 없습니다."
            text="수령 완료 후 리뷰를 작성할 수 있습니다."
          />
        ) : (
          <div className="operation-list">
            {reviews.map((item) => (
              <article className="compact-row" key={str(item, "id")}>
                <span>
                  <b>{"★".repeat(num(item, "rating"))}</b>
                  <small>{str(item, "content")}</small>
                </span>
                <div className="action-row">
                  <button onClick={() => void edit(item)}>수정</button>
                  <button onClick={() => void remove(str(item, "id"))}>삭제</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function InquiriesPanel() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMyInquiries();
    setLoading(false);
    if (result.ok) setItems(result.data?.inquiries ?? []);
    else setError(result.error?.message ?? "문의를 불러오지 못했습니다.");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reply = async (id: string) => {
    const message = replies[id]?.trim();
    if (!message) return;
    const result = await replyMyInquiry(id, message);
    if (!result.ok) return setError(result.error?.message ?? "메시지를 저장하지 못했습니다.");
    setReplies({ ...replies, [id]: "" });
    setNotice("문의 메시지를 추가했습니다.");
    await load();
  };

  if (loading) return <Loading text="문의 대화를 불러오는 중입니다." />;
  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div>
          <p>MY INQUIRIES</p>
          <h2>문의 대화</h2>
        </div>
        <Link className="secondary-button" to="/inquiry">
          새 문의
        </Link>
      </div>
      <Feedback error={error} notice={notice} />
      {items.length === 0 ? (
        <Empty
          title="문의가 없습니다."
          text="새 문의에서 고객센터 또는 판매자에게 문의하세요."
        />
      ) : (
        <div className="conversation-list">
          {items.map((item) => (
            <article key={item.id}>
              <header>
                <strong>{item.subject}</strong>
                <StatusBadge type="ready">{item.status}</StatusBadge>
              </header>
              <div className="message-list">
                {(item.inquiry_messages ?? [])
                  .filter((message) => !message.is_internal)
                  .map((message) => (
                    <p key={message.id}>
                      <span>{message.message}</span>
                      <small>{date(message.created_at)}</small>
                    </p>
                  ))}
              </div>
              {item.status !== "closed" && (
                <div className="reply-row">
                  <textarea
                    value={replies[item.id] ?? ""}
                    onChange={(event) =>
                      setReplies({ ...replies, [item.id]: event.target.value })
                    }
                  />
                  <button
                    className="primary-button"
                    disabled={!replies[item.id]?.trim()}
                    onClick={() => void reply(item.id)}
                  >
                    <Send size={15} /> 전송
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SecurityPanel() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const change = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirm)
      return setError("8자 이상 동일한 비밀번호를 입력하세요.");
    if (!supabaseAuthClient) return setError("인증 환경변수 설정이 필요합니다.");
    setBusy(true);
    const { error: updateError } = await supabaseAuthClient.auth.updateUser({
      password,
    });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    setPassword("");
    setConfirm("");
    setNotice("비밀번호를 변경했습니다.");
  };

  const logout = async (all: boolean) => {
    setBusy(true);
    if (supabaseAuthClient)
      await supabaseAuthClient.auth.signOut({ scope: all ? "global" : "local" });
    await authClient.signOut();
    clearAuthToken();
    setBusy(false);
    navigate("/auth", { replace: true });
  };

  return (
    <section className="dashboard-panel">
      <div className="panel-title-row">
        <div>
          <p>ACCOUNT SECURITY</p>
          <h2>비밀번호 및 로그인 관리</h2>
        </div>
        <StatusBadge type={isSupabaseAuthConfigured ? "live" : "ready"}>
          {isSupabaseAuthConfigured ? "보안 인증 연결" : "환경변수 설정 필요"}
        </StatusBadge>
      </div>
      <Feedback error={error} notice={notice} />

      <form className="operation-form" onSubmit={change}>
        <label>
          새 비밀번호
          <input
            required
            minLength={8}
            type="password"
            placeholder="8자 이상 입력"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label>
          새 비밀번호 확인
          <input
            required
            minLength={8}
            type="password"
            placeholder="비밀번호 재입력"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={busy}>
          비밀번호 변경
        </button>
      </form>

      <div
        style={{
          marginTop: "32px",
          borderTop: "1px solid #eee",
          paddingTop: "20px",
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "#333",
          }}
        >
          로그인 상태 관리
        </h3>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
          현재 기기에서 로그아웃하거나 다른 모든 기기(스마트폰, PC 등)의 로그인을
          일괄 해제합니다.
        </p>
        <div
          className="security-actions"
          style={{ display: "flex", gap: "10px" }}
        >
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void logout(false)}
          >
            로그아웃
          </button>
          <button
            className="secondary-button danger"
            disabled={busy}
            onClick={() => void logout(true)}
          >
            모든 기기에서 로그아웃
          </button>
        </div>
      </div>
    </section>
  );
}

export default function MyPage() {
  const path = useLocation().pathname;
  const [title, description] = details[path] ?? details["/mypage"];
  const [name, setName] = useState("회원");
  const onName = useCallback((value: string) => setName(value || "회원"), []);

  const panels: Record<string, React.ReactNode> = {
    "/mypage": <ProfilePanel onName={onName} />,
    "/mypage/deals": <ParticipationsPanel />,
    "/mypage/orders": <OrdersPanel />,
    "/mypage/auctions": <AuctionOrdersPanel />,
    "/mypage/restock-requests": <RestockRequestsPanel />,
    "/mypage/reviews": <ReviewsPanel />,
    "/mypage/inquiries": <InquiriesPanel />,
    "/mypage/seller-application": <SellerApplicationPanel />,
    "/mypage/security": <SecurityPanel />,
  };

  return (
    <AppShell>
      <section className="section-wrap account-layout">
        <aside className="account-sidebar">
          <div className="account-profile">
            <span>
              <UserRound />
            </span>
            <strong>{name}</strong>
            <small>일반 회원</small>
          </div>
          <nav>
            {menu.map(([to, label, Icon]) => (
              <Link className={path === to ? "active" : ""} key={to} to={to}>
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="account-content">
          <div className="account-heading">
            <div>
              <p>MY TIMEDEAL</p>
              <h1>{title}</h1>
              <span>{description}</span>
            </div>
            <StatusBadge type="live">안전한 보안 연결</StatusBadge>
          </div>
          {panels[path] ?? panels["/mypage"]}
        </div>
      </section>
    </AppShell>
  );
}