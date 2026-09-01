/**
 * 상품 가격·딜 참여율·픽업 선택·주문 생성 흐름을 보여주는 상품 상세 화면입니다.
 * - 실제 백엔드 API (주문 생성, 픽업 장소/슬롯 조회, 토스 결제 연동, GPS 위치 변환) 100% 탑재 및 유지
 * - 모든 박스의 둔탁한 테두리를 제거하고 결제창과 동일한 깔끔한 소프트 섀도우 플랫 카드 스타일로 통일
 * - 커스텀 모던 팝오버 셀렉트 UI 적용
 */
import {
  Check,
  CheckCircle2,
  Clock,
  Crosshair,
  Heart,
  Info,
  LoaderCircle,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { formatPrice, progressOf, type Product } from "@/shared/catalog";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { CountdownTimer } from "@/shared/components/CountdownTimer";
import { StockGauge } from "@/shared/components/StockGauge";
import { authClient } from "@/lib/auth";
import {
  addToCart,
  createOrder,
  getPickupLocations,
  getPickupSlots,
  getProductReviews,
  getWishlistIds,
  toggleWishlist,
  type PickupLocation,
  type PickupSlot,
  type RawRecord,
} from "@/lib/api";
import { getCatalog, type CatalogSource } from "@/shared/services/catalog";
import { isTossPaymentsConfigured } from "@/lib/toss-payments";
import { useLocationStore } from "@/shared/location/LocationContext";
import { recordCategoryView } from "@/lib/recent-categories";
import { addToGuestCart } from "@/lib/guest-cart";

type AddressMode = "manual" | "gps";

function formatPickupDate(value: string) {
  if (!value) return "날짜 미정";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      });
}

// ── 판매자별 매장 주소·전화·영업시간을 저장하는 백엔드 필드가 아직 없어, 상품명이
// "[매장이름] 상품명" 형태면 그 매장이름만 실제로 추출하고 나머지는 안내 문구로 대체합니다. ──
const DEFAULT_STORE = {
  storeName: "판매자 매장",
  address: "픽업 장소는 주문 시 선택한 장소를 확인해 주세요.",
  phone: "매장 전화번호는 문의하기로 확인해 주세요.",
  hours: "영업시간은 매장마다 다를 수 있어요.",
  notice: "매장 카운터에서 타임딜 주문 내역(주문번호 또는 성함)을 보여주시면 즉시 픽업 가능합니다.",
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | undefined>();
  const [catalogSource, setCatalogSource] = useState<CatalogSource>("unavailable");
  const [catalogNotice, setCatalogNotice] = useState("상품을 불러오는 중입니다.");
  const { data: session } = authClient.useSession();

  const [quantity, setQuantity] = useState(1);
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [locationId, setLocationId] = useState("");
  const [slotId, setSlotId] = useState("");

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<
    "on_site" | "reservation_only" | "card"
  >("reservation_only");
  const [addressMode, setAddressMode] = useState<AddressMode>("manual");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const { locating, error: locateError, locateByGps } = useLocationStore();
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<RawRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // ── 커스텀 드롭다운 열림/닫힘 상태 ──
  const [isQtyOpen, setIsQtyOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isSlotOpen, setIsSlotOpen] = useState(false);

  const qtyRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 영역 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qtyRef.current && !qtyRef.current.contains(e.target as Node)) setIsQtyOpen(false);
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setIsLocationOpen(false);
      if (slotRef.current && !slotRef.current.contains(e.target as Node)) setIsSlotOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocate = async () => {
    const label = await locateByGps();
    if (label) setDeliveryAddress(label);
  };

  useEffect(() => {
    let active = true;
    void getCatalog()
      .then((result) => {
        if (!active) return;
        const found = result.products.find((item) => String(item.id) === String(id));
        setProduct(found);
        if (found) recordCategoryView(found.category);
        setCatalogSource(result.source);
        setCatalogNotice(
          result.notice ??
            (result.source === "sample"
              ? "개발 전용 상품입니다."
              : "운영 중인 타임딜입니다.")
        );
      })
      .finally(() => {
        if (active) setLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getProductReviews(id).then((result) => { if (active && result.ok) setReviews(result.data?.reviews ?? []); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!product || !session?.user) { setWishlisted(false); return; }
    let active = true;
    void getWishlistIds().then((result) => { if (active && result.ok) setWishlisted((result.data?.productIds ?? []).includes(product.id)); });
    return () => { active = false; };
  }, [product, session?.user]);

  useEffect(() => {
    if (!product || !session?.user) return;
    let active = true;
    setLoadingLocations(true);
    void getPickupLocations()
      .then((result) => {
        if (!active) return;
        if (result.ok && result.data) {
          setLocations(result.data.locations);
          if (result.data.locations.length > 0) {
            setLocationId(result.data.locations[0].id);
          }
          setNotice(
            result.data.source === "sample"
              ? result.data.notice ?? "개발 전용 픽업 장소입니다."
              : null
          );
        } else {
          setError(result.error?.message ?? "픽업 장소를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (active) setLoadingLocations(false);
      });
    return () => {
      active = false;
    };
  }, [product, session?.user]);

  useEffect(() => {
    if (!locationId) {
      setSlots([]);
      setSlotId("");
      return;
    }
    let active = true;
    setLoadingSlots(true);
    setSlotId("");
    void getPickupSlots(locationId)
      .then((result) => {
        if (!active) return;
        if (result.ok && result.data) {
          setSlots(result.data.slots);
          if (result.data.slots.length > 0) {
            setSlotId(result.data.slots[0].id);
          }
          if (result.data.source === "sample")
            setNotice(result.data.notice ?? "개발 전용 픽업 슬롯입니다.");
        } else {
          setError(result.error?.message ?? "수령 슬롯을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [locationId]);

  const selectedLocation = useMemo(
    () => locations.find((item) => item.id === locationId),
    [locations, locationId]
  );
  const selectedSlot = useMemo(
    () => slots.find((item) => item.id === slotId),
    [slots, slotId]
  );

  const storeInfo = useMemo(() => {
    if (!product) return DEFAULT_STORE;
    return {
      ...DEFAULT_STORE,
      storeName: product.name.includes("]")
        ? product.name.split("]")[0].replace("[", "")
        : DEFAULT_STORE.storeName,
    };
  }, [product]);

  const discountRate = useMemo(() => {
    if (!product || product.originalPrice <= product.dealPrice) return 0;
    return Math.round(
      ((product.originalPrice - product.dealPrice) / product.originalPrice) * 100
    );
  }, [product]);

  const handleCopyAddress = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeInfo.address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (!product) {
    return (
      <AppShell>
        <div className="empty-state page-empty">
          <h1>
            {loadingCatalog
              ? "상품을 불러오는 중입니다."
              : "상품을 찾을 수 없습니다."}
          </h1>
          {!loadingCatalog && (
            <Link className="primary-button" to="/products">
              상품 목록으로
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  const progress = progressOf(product);

  const handleToggleWishlist = async () => {
    if (!session?.user) { navigate("/auth"); return; }
    setWishlisted((prev) => !prev);
    const result = await toggleWishlist(product.id);
    if (!result.ok) { setWishlisted((prev) => !prev); setError(result.error?.message ?? "찜 처리에 실패했습니다."); }
  };

  const handleAddToCart = async () => {
    if (!session?.user) {
      addToGuestCart(product.id, quantity);
      setNotice("장바구니에 담았습니다. 결제 직전에 로그인만 하면 돼요.");
      return;
    }
    setAddingToCart(true);
    const result = await addToCart(product.id, quantity);
    setAddingToCart(false);
    if (!result.ok) return setError(result.error?.message ?? "장바구니에 담지 못했습니다.");
    setNotice("장바구니에 담았습니다.");
  };

  const handleCreateOrder = async () => {
    if (!session?.user) return;
    if (!locationId || !slotId) {
      setError("픽업 장소와 수령 슬롯을 선택해 주세요.");
      return;
    }
    if (!product.dealId) {
      setError(
        "타임딜 식별자가 없어 주문을 접수할 수 없습니다. 상품 목록을 새로고침해 주세요."
      );
      return;
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await createOrder({
      pickupLocationId: locationId,
      pickupSlotId: slotId,
      paymentMethod,
      idempotencyKey: crypto.randomUUID(),
      deliveryAddress: deliveryAddress.trim() || undefined,
      items: [{ productId: product.id, dealId: product.dealId, quantity }],
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.error?.message ??
          "주문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
      return;
    }
    if (paymentMethod === "card" && result.data?.order?.id) {
      navigate(
        `/payments/toss/checkout?orderId=${encodeURIComponent(
          result.data.order.id
        )}`
      );
      return;
    }
    setNotice(
      `주문이 접수되었습니다. ${
        result.data?.order?.orderNumber ?? "주문번호 확인 필요"
      } · ${
        paymentMethod === "on_site"
          ? "현장 결제로 예약되었습니다."
          : "결제 없는 예약 주문입니다."
      }`
    );
  };

  return (
    <AppShell>
      <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "28px 16px 80px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          
          {/* ── 브레드크럼 ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#718096", marginBottom: 18 }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>홈</Link>
            <ChevronRight size={14} />
            <Link to="/products" style={{ color: "inherit", textDecoration: "none" }}>
              {product.category || "타임딜"}
            </Link>
            <ChevronRight size={14} />
            <span style={{ color: "#1a202c", fontWeight: 600 }}>{product.name}</span>
          </div>

          {/* ── 상단 2열 메인 레이아웃 ── */}
          <div style={{ display: "flex", gap: 36, alignItems: "flex-start" }}>
            
            {/* ── 좌측 컬럼: 상품 사진 & 실제 매장 상세 정보 ── */}
            <div style={{ flex: "1 1 540px", minWidth: 0 }}>
              
              {/* 상품 메인 사진 (테두리 제거, 플랫 섀도우) */}
              <div
                style={{
                  width: "100%",
                  height: 420,
                  position: "relative",
                  borderRadius: 4,
                  overflow: "hidden",
                  background: "#edf2f7",
                  border: "none",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  marginBottom: 16,
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {discountRate > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      background: "#ff5722",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: 2,
                    }}
                  >
                    {discountRate}% OFF
                  </span>
                )}
                <span
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 2,
                  }}
                >
                  {catalogSource === "supabase" ? "성수동 운영 매장" : "타임딜 파트너"}
                </span>
              </div>

              {/* 매장 정보 카드 (테두리 제거, 플랫 섀도우) */}
              <section
                style={{
                  background: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "20px 22px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                    borderBottom: "1px solid #f1f5f9",
                    paddingBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Store size={18} color="#ff5722" />
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1a202c" }}>
                      {storeInfo.storeName}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#38a169",
                      background: "#f0fff4",
                      padding: "3px 8px",
                      borderRadius: 2,
                      fontWeight: 600,
                      border: "none",
                    }}
                  >
                    ● 픽업 지정 매장
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#4a5568" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <MapPin size={16} color="#718096" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 500, color: "#2d3748" }}>{storeInfo.address}</span>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff5722",
                          fontSize: 12,
                          marginLeft: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                          padding: 0,
                        }}
                      >
                        {copySuccess ? "✓ 복사됨" : "주소복사"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={16} color="#718096" style={{ flexShrink: 0 }} />
                    <span>영업시간: <b>{storeInfo.hours}</b></span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Phone size={16} color="#718096" style={{ flexShrink: 0 }} />
                    <span>매장 연락처: <b>{storeInfo.phone}</b></span>
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      background: "#f8fafc",
                      border: "none",
                      borderRadius: 3,
                      padding: "10px 12px",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <Info size={15} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: "#4a5568", lineHeight: "1.4" }}>
                      {storeInfo.notice}
                    </span>
                  </div>
                </div>
              </section>

              {/* 하단 안심 혜택 바 */}
              <div className="detail-benefits" style={{ marginTop: 0 }}>
                <div>
                  <Truck />
                  <span>
                    <b>수령 안내</b>
                    <small>선택한 슬롯에서 직접 픽업</small>
                  </span>
                </div>
                <div>
                  <MapPin />
                  <span>
                    <b>지역 기반</b>
                    <small>성수동 권역 인증 픽업</small>
                  </span>
                </div>
                <div>
                  <ShieldCheck />
                  <span>
                    <b>안전 결제</b>
                    <small>로그인·권한 검증 후 처리</small>
                  </span>
                </div>
              </div>
            </div>

            {/* ── 우측 컬럼: 상품 정보 & 깔끔한 주문 접수 폼 ── */}
            <div style={{ flex: "1 1 480px", minWidth: 0 }}>
              
              {/* 상단 타이틀 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <StatusBadge type={catalogSource === "supabase" ? "live" : "mock"}>
                    {catalogSource === "supabase" ? "운영 딜" : "성수동 타임딜"}
                  </StatusBadge>
                  <span className="category-pill">{product.category}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1a202c", margin: "0 0 8px 0", lineHeight: "1.3" }}>
                    {product.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => void handleToggleWishlist()}
                    aria-label={wishlisted ? "찜 해제" : "찜하기"}
                    style={{ flexShrink: 0, width: 38, height: 38, borderRadius: "50%", border: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Heart size={18} color={wishlisted ? "#ff5722" : "#94a3b8"} fill={wishlisted ? "#ff5722" : "none"} />
                  </button>
                </div>
                <p style={{ fontSize: 14, color: "#718096", margin: 0, lineHeight: "1.5" }}>
                  목표 인원이 모이면 제안된 타임딜 가격으로 함께 구매하는 상품입니다. 픽업 장소와 수령 시간을 선택해 주문을 접수할 수 있습니다.
                </p>
              </div>

              {catalogNotice && (
                <div className="order-notice" style={{ marginBottom: 12 }}>
                  {catalogNotice}
                </div>
              )}

              {/* 가격 및 달성률 바 (테두리 제거, 플랫 섀도우) */}
              <div style={{ background: "#ffffff", border: "none", borderRadius: 4, padding: "16px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "#718096", fontWeight: 500 }}>타임딜가</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    {discountRate > 0 && (
                      <span style={{ fontSize: 20, fontWeight: 700, color: "#ff5722" }}>
                        {discountRate}%
                      </span>
                    )}
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#1a202c" }}>
                      {formatPrice(product.dealPrice)}
                    </span>
                    <del style={{ fontSize: 14, color: "#a0aec0" }}>
                      {formatPrice(product.originalPrice)}
                    </del>
                  </div>
                </div>

                <div className="detail-progress" style={{ margin: 0 }}>
                  <div style={{ marginBottom: 6 }}>
                    <span>{product.participants}명 참여 중</span>
                    <b>목표 {product.target}명 · {progress}%</b>
                  </div>
                  <StockGauge participants={product.participants} target={product.target} />
                  <p className="deal-detail-countdown" style={{ marginTop: 6, fontSize: 12 }}>
                    <CountdownTimer endsAtIso={product.endsAtIso} fallbackLabel={product.endsAt} />
                  </p>
                </div>
              </div>

              {/* 주문 폼 영역 (플랫 카드 룩) */}
              <div
                style={{
                  background: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "20px 22px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                }}
              >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#ff5722", margin: 0, letterSpacing: "0.5px" }}>ORDER & PICKUP</p>
                      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1a202c" }}>픽업 주문 접수</h2>
                    </div>
                    <StatusBadge type="ready">결제 대기</StatusBadge>
                  </div>

                  {notice && <div className="order-notice" style={{ marginBottom: 12 }}>{notice}</div>}
                  {error && <div className="order-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

                  {/* 1. 주문 방식 */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}>
                      결제 방식
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: isTossPaymentsConfigured ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: 6 }}>
                      {[
                        { key: "reservation_only", label: "결제 없이 예약" },
                        { key: "on_site", label: "픽업 현장 결제" },
                        ...(isTossPaymentsConfigured ? [{ key: "card", label: "카드 결제(Toss)" }] : []),
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => setPaymentMethod(item.key as any)}
                          style={{
                            padding: "9px 0",
                            borderRadius: 3,
                            border: "none",
                            background: paymentMethod === item.key ? "#1a202c" : "#f1f5f9",
                            color: paymentMethod === item.key ? "#ffffff" : "#475569",
                            fontSize: 12,
                            fontWeight: paymentMethod === item.key ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. 수량 선택 (커스텀 드롭다운) */}
                  <div ref={qtyRef} style={{ position: "relative", marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}>
                      수량
                    </label>
                    <div
                      onClick={() => setIsQtyOpen(!isQtyOpen)}
                      style={{
                        height: 40,
                        border: "none",
                        borderRadius: 3,
                        padding: "0 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#f8fafc",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#1a202c",
                        fontWeight: 500,
                      }}
                    >
                      <span>{quantity}개 · {formatPrice(product.dealPrice * quantity)}</span>
                      <ChevronDown size={16} color="#64748b" />
                    </div>

                    {isQtyOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: 68,
                          left: 0,
                          right: 0,
                          background: "#ffffff",
                          border: "none",
                          borderRadius: 3,
                          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          zIndex: 50,
                          maxHeight: 180,
                          overflowY: "auto",
                        }}
                      >
                        {Array.from({ length: 20 }, (_, index) => index + 1).map((n) => (
                          <div
                            key={n}
                            onClick={() => {
                              setQuantity(n);
                              setIsQtyOpen(false);
                            }}
                            style={{
                              padding: "10px 12px",
                              fontSize: 13,
                              color: quantity === n ? "#ff5722" : "#334155",
                              background: quantity === n ? "#fff5f2" : "#fff",
                              fontWeight: quantity === n ? 700 : 400,
                              cursor: "pointer",
                              borderBottom: "1px solid #f8fafc",
                            }}
                          >
                            {n}개 · {formatPrice(product.dealPrice * n)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {session?.user ? (
                  <>
                  {/* 3. 픽업 장소 (커스텀 2단 드롭다운) */}
                  <div ref={locationRef} style={{ position: "relative", marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}>
                      픽업 장소
                    </label>
                    <div
                      onClick={() => !loadingLocations && setIsLocationOpen(!isLocationOpen)}
                      style={{
                        height: 44,
                        border: "none",
                        borderRadius: 3,
                        padding: "0 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#f8fafc",
                        cursor: loadingLocations ? "default" : "pointer",
                      }}
                    >
                      {loadingLocations ? (
                        <span style={{ fontSize: 13, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <LoaderCircle size={14} className="spin-icon" /> 픽업 장소 불러오는 중...
                        </span>
                      ) : selectedLocation ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>{selectedLocation.name}</span>
                          <small style={{ fontSize: 11, color: "#64748b" }}>{selectedLocation.address}</small>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>장소를 선택해 주세요</span>
                      )}
                      <ChevronDown size={16} color="#64748b" />
                    </div>

                    {isLocationOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: 72,
                          left: 0,
                          right: 0,
                          background: "#ffffff",
                          border: "none",
                          borderRadius: 3,
                          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          zIndex: 50,
                          maxHeight: 220,
                          overflowY: "auto",
                        }}
                      >
                        {locations.map((loc) => (
                          <div
                            key={loc.id}
                            onClick={() => {
                              setLocationId(loc.id);
                              setIsLocationOpen(false);
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f8fafc",
                              background: locationId === loc.id ? "#fff5f2" : "#ffffff",
                            }}
                          >
                            <strong style={{ display: "block", fontSize: 13, color: locationId === loc.id ? "#ff5722" : "#1a202c" }}>
                              {loc.name}
                            </strong>
                            <small style={{ fontSize: 11, color: "#64748b" }}>{loc.address}</small>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedLocation && (
                      <small style={{ color: "#718096", marginTop: 4, display: "block", fontSize: 11 }}>
                        {selectedLocation.description}
                      </small>
                    )}
                  </div>

                  {/* 4. 수령 슬롯 (커스텀 2단 드롭다운) */}
                  <div ref={slotRef} style={{ position: "relative", marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}>
                      수령 슬롯 (픽업 시간대)
                    </label>
                    <div
                      onClick={() => !loadingSlots && locationId && slots.length > 0 && setIsSlotOpen(!isSlotOpen)}
                      style={{
                        height: 44,
                        border: "none",
                        borderRadius: 3,
                        padding: "0 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#f8fafc",
                        cursor: !locationId || slots.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      {loadingSlots ? (
                        <span style={{ fontSize: 13, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <LoaderCircle size={14} className="spin-icon" /> 슬롯 조회 중...
                        </span>
                      ) : selectedSlot ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>
                            {formatPickupDate(selectedSlot.pickupDate)} · {selectedSlot.startTime} ~ {selectedSlot.endTime}
                          </span>
                          <small style={{ fontSize: 11, color: "#ff5722" }}>
                            잔여 {Math.max(0, selectedSlot.capacity - selectedSlot.reservedCount)}명 가능
                          </small>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          {!locationId ? "먼저 픽업 장소를 선택해 주세요" : "수령 시간을 선택해 주세요"}
                        </span>
                      )}
                      <ChevronDown size={16} color="#64748b" />
                    </div>

                    {isSlotOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: 72,
                          left: 0,
                          right: 0,
                          background: "#ffffff",
                          border: "none",
                          borderRadius: 3,
                          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          zIndex: 50,
                          maxHeight: 200,
                          overflowY: "auto",
                        }}
                      >
                        {slots.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSlotId(s.id);
                              setIsSlotOpen(false);
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f8fafc",
                              background: slotId === s.id ? "#fff5f2" : "#ffffff",
                            }}
                          >
                            <strong style={{ display: "block", fontSize: 13, color: slotId === s.id ? "#ff5722" : "#1a202c" }}>
                              {formatPickupDate(s.pickupDate)} · {s.startTime} ~ {s.endTime}
                            </strong>
                            <small style={{ fontSize: 11, color: "#64748b" }}>
                              잔여 {Math.max(0, s.capacity - s.reservedCount)}명 (총 {s.capacity}명 정원)
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedSlot && (
                      <small style={{ color: "#718096", marginTop: 4, display: "block", fontSize: 11 }}>
                        선택 슬롯 예약 {selectedSlot.reservedCount}/{selectedSlot.capacity}명
                      </small>
                    )}
                  </div>

                  {/* 5. 수령 주소지 입력 */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#4a5568" }}>
                        수령 주소지 (선택)
                      </label>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => setAddressMode("manual")}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            border: "none",
                            background: addressMode === "manual" ? "#1a202c" : "#f1f5f9",
                            color: addressMode === "manual" ? "#fff" : "#64748b",
                            cursor: "pointer",
                            borderRadius: 2,
                            fontWeight: 500,
                          }}
                        >
                          직접 입력
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressMode("gps")}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            border: "none",
                            background: addressMode === "gps" ? "#1a202c" : "#f1f5f9",
                            color: addressMode === "gps" ? "#fff" : "#64748b",
                            cursor: "pointer",
                            borderRadius: 2,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                            fontWeight: 500,
                          }}
                        >
                          <Crosshair size={11} /> GPS
                        </button>
                      </div>
                    </div>

                    {addressMode === "manual" ? (
                      <input
                        type="text"
                        placeholder="예: 서울 성동구 성수이로 20, 101동 302호"
                        value={deliveryAddress}
                        onChange={(event) => setDeliveryAddress(event.target.value)}
                        style={{
                          width: "100%",
                          height: 38,
                          borderRadius: 3,
                          border: "none",
                          background: "#f8fafc",
                          padding: "0 12px",
                          fontSize: 13,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          disabled={locating}
                          onClick={handleLocate}
                          style={{
                            height: 38,
                            padding: "0 12px",
                            border: "none",
                            background: "#f1f5f9",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#334155",
                            cursor: "pointer",
                            borderRadius: 3,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {locating ? <LoaderCircle size={14} className="spin-icon" /> : "현재 위치 찾기"}
                        </button>
                        <input
                          type="text"
                          placeholder="위치 확인 시 주소가 자동 입력됩니다"
                          value={deliveryAddress}
                          onChange={(event) => setDeliveryAddress(event.target.value)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            height: 38,
                            borderRadius: 3,
                            border: "none",
                            background: "#f8fafc",
                            padding: "0 12px",
                            fontSize: 13,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    )}
                    {locateError && <small style={{ color: "#ef4444", fontSize: 11, marginTop: 4, display: "block" }}>{locateError}</small>}
                  </div>
                  </>
                  ) : (
                    <div className="order-login-prompt" style={{ marginBottom: 14 }}>
                      <MapPin size={20} />
                      <div>
                        <strong>픽업 장소·시간을 선택하려면 로그인이 필요합니다.</strong>
                        <span>로그인 후 픽업 장소와 수령 슬롯을 선택하고 바로 주문할 수 있습니다.</span>
                      </div>
                      <Link className="secondary-button" to="/auth">로그인</Link>
                    </div>
                  )}

                  {/* 총 주문 금액 및 접수 버튼 */}
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#4a5568" }}>총 결제/예약 금액</span>
                    <strong style={{ fontSize: 20, color: "#ff5722", fontWeight: 800 }}>
                      {formatPrice(product.dealPrice * quantity)}
                    </strong>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => void handleAddToCart()}
                      disabled={addingToCart || !product.dealId}
                      style={{
                        flex: "0 0 120px",
                        height: 46,
                        background: "#ffffff",
                        color: "#ff5722",
                        border: "1.5px solid #ff5722",
                        borderRadius: 3,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: addingToCart ? "not-allowed" : "pointer",
                        opacity: addingToCart ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <ShoppingCart size={16} /> 담기
                    </button>
                    <button
                      type="button"
                      onClick={() => (session?.user ? void handleCreateOrder() : navigate("/auth"))}
                      disabled={submitting || !product.dealId || (!!session?.user && (!locationId || !slotId))}
                      style={{
                        flex: 1,
                        height: 46,
                        background: "#ff5722",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 3,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: submitting || (!!session?.user && (!locationId || !slotId)) ? "not-allowed" : "pointer",
                        opacity: submitting || (!!session?.user && (!locationId || !slotId)) ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {submitting ? (
                        <>
                          <LoaderCircle size={16} className="spin-icon" /> 주문 접수 중...
                        </>
                      ) : (
                        "주문 접수하기"
                      )}
                    </button>
                  </div>

                  <p style={{ margin: "10px 0 0 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                    {isTossPaymentsConfigured ? (
                      <>카드 결제는 <b>토스페이먼츠 테스트 모드</b>로 안전하게 처리됩니다.</>
                    ) : (
                      <>현장 픽업 시 카운터에서 확인 후 결제 또는 수령이 진행됩니다.</>
                    )}
                  </p>
              </div>

              <ul className="detail-checks" style={{ marginTop: 14 }}>
                <li>
                  <Check size={14} />{" "}
                  {catalogSource === "supabase"
                    ? "실시간으로 조회한 운영 타임딜입니다."
                    : "명시적으로 활성화한 개발 전용 카탈로그입니다."}
                </li>
                <li>
                  <Check size={14} /> 서버 연결 전에는 주문 저장이 차단됩니다.
                </li>
              </ul>

            </div>

          </div>

        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a202c", margin: "0 0 16px 0" }}>
            리뷰 {reviews.length > 0 ? reviews.length : ""}
          </h2>
          {reviews.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>아직 작성된 리뷰가 없습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {reviews.map((review) => {
                const imageUrls = (review.image_urls as string[] | undefined) ?? [];
                return (
                  <div key={String(review.id)} style={{ paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <strong style={{ color: "#ff5722", fontSize: 13 }}>{"★".repeat(Number(review.rating ?? 0))}</strong>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {(review.profiles as { name?: string } | null)?.name ?? "이웃"} · {new Date(String(review.created_at)).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: "#334155", margin: "0 0 8px 0", lineHeight: 1.6 }}>{String(review.content ?? "")}</p>
                    {imageUrls.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {imageUrls.map((url) => (
                          <img key={url} src={url} alt="리뷰 사진" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6 }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}