/**
 * 상품 가격·딜 참여율·픽업 선택·주문 생성 흐름을 보여주는 상품 상세 화면입니다.
 * 첫 렌더는 빈 로딩 상태이며 `getCatalog()` 결과가 도착한 뒤에만 상품을 표시합니다.
 * 개발 데이터는 VITE_ENABLE_SAMPLE_DATA=true인 개발 빌드에서만 허용하고 운영 오류를 대체하지 않습니다.
 * 주문·픽업 API는 직접 fetch하지 않고 `src/lib/api.ts`의 apiFetch 경계를 사용합니다.
 */
import { Check, Crosshair, LoaderCircle, MapPin, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { formatPrice, progressOf, type Product } from "@/shared/catalog";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { CountdownTimer } from "@/shared/components/CountdownTimer";
import { StockGauge } from "@/shared/components/StockGauge";
import { authClient } from "@/lib/auth";
import { createOrder, getPickupLocations, getPickupSlots, type PickupLocation, type PickupSlot } from "@/lib/api";
import { getCatalog, type CatalogSource } from "@/shared/services/catalog";
import { isTossPaymentsConfigured } from "@/lib/toss-payments";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps-loader";

type AddressMode = "manual" | "gps";

function formatPickupDate(value: string) {
  if (!value) return "날짜 미정";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

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
  const [paymentMethod, setPaymentMethod] = useState<"on_site" | "reservation_only" | "card">("reservation_only");
  const [addressMode, setAddressMode] = useState<AddressMode>("manual");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLocate = () => {
    if (!navigator.geolocation) { setLocateError("이 브라우저에서는 위치 조회를 지원하지 않습니다."); return; }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordLabel = `위도 ${latitude.toFixed(5)}, 경도 ${longitude.toFixed(5)}`;
        if (!isGoogleMapsConfigured) { setDeliveryAddress(coordLabel); setLocating(false); return; }
        void loadGoogleMaps().then((maps) => new maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } })).then((response) => {
          setDeliveryAddress(response.results[0]?.formatted_address ?? coordLabel);
        }).catch(() => setDeliveryAddress(coordLabel)).finally(() => setLocating(false));
      },
      (geoError) => {
        setLocating(false);
        setLocateError(geoError.code === geoError.PERMISSION_DENIED ? "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요." : "현재 위치를 확인하지 못했습니다.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    let active = true;
    void getCatalog().then((result) => {
      if (!active) return;
      setProduct(result.products.find((item) => item.id === id));
      setCatalogSource(result.source);
      setCatalogNotice(result.notice ?? (result.source === "sample" ? "개발 전용 상품입니다." : "운영 중인 타임딜입니다."));
    }).finally(() => { if (active) setLoadingCatalog(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!product || !session?.user) return;
    let active = true;
    setLoadingLocations(true);
    void getPickupLocations().then((result) => {
      if (!active) return;
      if (result.ok && result.data) {
        setLocations(result.data.locations);
        setNotice(result.data.source === "sample" ? result.data.notice ?? "개발 전용 픽업 장소입니다." : null);
      } else {
        setError(result.error?.message ?? "픽업 장소를 불러오지 못했습니다.");
      }
    }).finally(() => { if (active) setLoadingLocations(false); });
    return () => { active = false; };
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
    void getPickupSlots(locationId).then((result) => {
      if (!active) return;
      if (result.ok && result.data) {
        setSlots(result.data.slots);
        if (result.data.source === "sample") setNotice(result.data.notice ?? "개발 전용 픽업 슬롯입니다.");
      } else {
        setError(result.error?.message ?? "수령 슬롯을 불러오지 못했습니다.");
      }
    }).finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [locationId]);

  const selectedLocation = useMemo(() => locations.find((item) => item.id === locationId), [locations, locationId]);
  const selectedSlot = useMemo(() => slots.find((item) => item.id === slotId), [slots, slotId]);

  if (!product) return <AppShell><div className="empty-state page-empty"><h1>{loadingCatalog ? "상품을 불러오는 중입니다." : "상품을 찾을 수 없습니다."}</h1>{!loadingCatalog && <Link className="primary-button" to="/products">상품 목록으로</Link>}</div></AppShell>;

  const progress = progressOf(product);
  const handleCreateOrder = async () => {
    if (!session?.user) return;
    if (!locationId || !slotId) {
      setError("픽업 장소와 수령 슬롯을 선택해 주세요.");
      return;
    }
    if (!product.dealId) {
      setError("타임딜 식별자가 없어 주문을 접수할 수 없습니다. 상품 목록을 새로고침해 주세요.");
      return;
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await createOrder({ pickupLocationId: locationId, pickupSlotId: slotId, paymentMethod, idempotencyKey: crypto.randomUUID(), deliveryAddress: deliveryAddress.trim() || undefined, items: [{ productId: product.id, dealId: product.dealId, quantity }] });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error?.message ?? "주문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (paymentMethod === "card" && result.data?.order?.id) {
      navigate(`/payments/toss/checkout?orderId=${encodeURIComponent(result.data.order.id)}`);
      return;
    }
    setNotice(`주문이 접수되었습니다. ${result.data?.order?.orderNumber ?? "주문번호 확인 필요"} · ${paymentMethod === "on_site" ? "현장 결제로 예약되었습니다." : "결제 없는 예약 주문입니다."}`);
  };

  return <AppShell>
    <section className="product-detail">
      <div className="detail-gallery"><img src={product.image} alt={product.name} /><span>{catalogSource === "supabase" ? "운영 타임딜" : "개발 전용 카탈로그"}</span></div>
      <div className="detail-info">
        <div className="detail-labels"><StatusBadge type={catalogSource === "supabase" ? "live" : "mock"}>{catalogSource === "supabase" ? "운영 딜" : "개발 전용 딜"}</StatusBadge> <span className="category-pill">{product.category}</span></div>
        <h1>{product.name}</h1>
        <p className="detail-description">목표 인원이 모이면 제안된 타임딜 가격으로 함께 구매하는 상품입니다. 픽업 장소와 수령 시간을 선택해 주문을 접수할 수 있습니다.</p>
        {catalogNotice && <div className="order-notice">{catalogNotice}</div>}
        <div className="detail-price"><span>타임딜가</span><strong>{formatPrice(product.dealPrice)}</strong><del>{formatPrice(product.originalPrice)}</del></div>
        <div className="detail-progress"><div><span>{product.participants}명 참여 중</span><b>목표 {product.target}명 · {progress}%</b></div><StockGauge participants={product.participants} target={product.target} /><p className="deal-detail-countdown"><CountdownTimer endsAtIso={product.endsAtIso} fallbackLabel={product.endsAt} /></p></div>

        {!session?.user ? <div className="order-login-prompt"><MapPin size={20} /><div><strong>주문하려면 로그인이 필요합니다.</strong><span>로그인 후 픽업 장소와 수령 슬롯을 선택할 수 있습니다.</span></div><Link className="secondary-button" to="/auth">로그인</Link></div> : <div className="order-form" aria-label="픽업 주문 정보">
          <div className="order-form-heading"><div><p>ORDER & PICKUP</p><h2>픽업 주문 접수</h2></div><StatusBadge type="ready">결제 대기</StatusBadge></div>
          {notice && <div className="order-notice">{notice}</div>}
          {error && <div className="order-error" role="alert">{error}</div>}
          <fieldset className="payment-method"><legend>주문 방식</legend><label><input type="radio" name="paymentMethod" checked={paymentMethod === "reservation_only"} onChange={() => setPaymentMethod("reservation_only")} /> 결제 없이 예약</label><label><input type="radio" name="paymentMethod" checked={paymentMethod === "on_site"} onChange={() => setPaymentMethod("on_site")} /> 픽업 현장 결제</label>{isTossPaymentsConfigured && <label><input type="radio" name="paymentMethod" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} /> 카드 결제(Toss, 테스트)</label>}</fieldset>
          <label>수량<select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}개 · {formatPrice(product.dealPrice * value)}</option>)}</select></label>
          <label>픽업 장소{loadingLocations ? <span className="inline-loading"><LoaderCircle size={15} /> 불러오는 중</span> : <select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">장소를 선택해 주세요</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.address}</option>)}</select>}{selectedLocation && <small>{selectedLocation.description}</small>}</label>
          <label>수령 슬롯{loadingSlots ? <span className="inline-loading"><LoaderCircle size={15} /> 불러오는 중</span> : <select value={slotId} disabled={!locationId || !slots.length} onChange={(event) => setSlotId(event.target.value)}><option value="">{!locationId ? "먼저 장소를 선택해 주세요" : slots.length ? "시간을 선택해 주세요" : "가능한 슬롯이 없습니다"}</option>{slots.map((slot) => <option key={slot.id} value={slot.id}>{formatPickupDate(slot.pickupDate)} · {slot.startTime}–{slot.endTime} · 잔여 {Math.max(0, slot.capacity - slot.reservedCount)}명</option>)}</select>}{selectedSlot && <small>선택한 슬롯 예약 {selectedSlot.reservedCount}/{selectedSlot.capacity}명</small>}</label>
          <fieldset className="delivery-address"><legend>수령 주소 (선택)</legend>
            <div className="address-mode-tabs">
              <button type="button" className={addressMode === "manual" ? "active" : ""} onClick={() => setAddressMode("manual")}>직접 입력</button>
              <button type="button" className={addressMode === "gps" ? "active" : ""} onClick={() => setAddressMode("gps")}><Crosshair size={13} /> GPS로 찾기</button>
            </div>
            {addressMode === "manual"
              ? <input type="text" placeholder="예: 서울 성동구 성수이로 20, 101동 302호" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} />
              : <div className="address-gps-row">
                  <button type="button" className="secondary-button" disabled={locating} onClick={handleLocate}>{locating ? <><LoaderCircle size={15} className="spin-icon" /> 위치 확인 중</> : <><Crosshair size={15} /> 현재 위치로 주소 찾기</>}</button>
                  <input type="text" placeholder="찾은 주소가 여기 표시됩니다 (수정 가능)" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} />
                </div>}
            {locateError && <small className="address-error">{locateError}</small>}
          </fieldset>
          <button type="button" className="primary-button full" onClick={() => void handleCreateOrder()} disabled={submitting || !locationId || !slotId || !product.dealId}>{submitting ? <><LoaderCircle size={17} className="spin-icon" /> 주문 접수 중</> : "주문 접수하기"}</button>
          <p className="integration-note">{isTossPaymentsConfigured ? <>카드 결제는 <b>토스페이먼츠 테스트 모드</b>로 진행되며 실제 카드가 승인되지 않습니다.</> : <>PG 연동 전에는 <b>현장 결제</b> 또는 <b>결제 없는 예약</b>으로만 접수하며 paid/refunded 상태를 만들지 않습니다.</>}</p>
        </div>}

        <div className="detail-benefits"><div><Truck /><span><b>수령 안내</b><small>선택한 장소·슬롯에서 픽업</small></span></div><div><MapPin /><span><b>지역 기반</b><small>관리자가 활성화한 지역 픽업</small></span></div><div><ShieldCheck /><span><b>안전한 경계</b><small>로그인·권한 검증 후 주문</small></span></div></div>
        <ul className="detail-checks"><li><Check /> {catalogSource === "supabase" ? "실시간으로 조회한 운영 타임딜입니다." : "명시적으로 활성화한 개발 전용 카탈로그입니다."}</li><li><Check /> 서버 연결 전에는 주문 저장이 차단됩니다.</li></ul>
      </div>
    </section>
  </AppShell>;
}
