/**
 * 실제 장바구니(cart_items) API로 담아둔 상품을 모아 픽업 장소·슬롯·결제수단을 선택해
 * 한 번에 여러 상품을 주문하는 화면입니다. 결제 생성은 기존 /orders API를 그대로 재사용합니다.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { formatPrice } from "@/shared/catalog";
import {
  clearCart,
  createOrder,
  getCart,
  getPickupLocations,
  getPickupSlots,
  removeCartItem,
  updateCartItem,
  type PickupLocation,
  type PickupSlot,
} from "@/lib/api";
import { isTossPaymentsConfigured } from "@/lib/toss-payments";

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string; image: string; category: string; regularPrice: number; status: string } | null;
  deal: { id: string; dealPrice: number } | null;
};

const PAYMENT_LABELS: Record<string, string> = { on_site: "현장 결제", reservation_only: "결제 없는 예약", card: "카드 결제(Toss)" };

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [locationId, setLocationId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"on_site" | "reservation_only" | "card">("reservation_only");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const result = await getCart();
    setLoading(false);
    if (result.ok) setItems((result.data?.items ?? []) as unknown as CartItem[]);
    else setError(result.error?.message ?? "장바구니를 불러오지 못했습니다.");
  };

  useEffect(() => {
    void load();
    void getPickupLocations().then((result) => { if (result.ok) setLocations(result.data?.locations ?? []); });
  }, []);

  useEffect(() => {
    if (!locationId) { setSlots([]); setSlotId(""); return; }
    void getPickupSlots(locationId).then((result) => { if (result.ok) setSlots(result.data?.slots ?? []); });
  }, [locationId]);

  const orderableItems = items.filter((item) => item.deal && item.product?.status === "active");
  const unavailableItems = items.filter((item) => !item.deal || item.product?.status !== "active");
  const total = orderableItems.reduce((sum, item) => sum + (item.deal?.dealPrice ?? 0) * item.quantity, 0);

  const changeQuantity = async (item: CartItem, next: number) => {
    if (next < 1) { await remove(item.id); return; }
    if (next > 20) return;
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, quantity: next } : row)));
    const result = await updateCartItem(item.id, next);
    if (!result.ok) { setError(result.error?.message ?? "수량을 변경하지 못했습니다."); await load(); }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((row) => row.id !== id));
    const result = await removeCartItem(id);
    if (!result.ok) { setError(result.error?.message ?? "삭제하지 못했습니다."); await load(); }
  };

  const checkout = async () => {
    if (!locationId || !slotId) { setError("픽업 장소와 수령 슬롯을 선택해 주세요."); return; }
    if (!orderableItems.length) { setError("주문 가능한 상품이 없습니다."); return; }
    setSubmitting(true);
    setError(null);
    const result = await createOrder({
      pickupLocationId: locationId,
      pickupSlotId: slotId,
      paymentMethod,
      idempotencyKey: crypto.randomUUID(),
      items: orderableItems.map((item) => ({ productId: item.productId, dealId: item.deal!.id, quantity: item.quantity })),
    });
    setSubmitting(false);
    if (!result.ok) return setError(result.error?.message ?? "주문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    await clearCart();
    if (paymentMethod === "card" && result.data?.order?.id) {
      navigate(`/payments/toss/checkout?orderId=${encodeURIComponent(result.data.order.id)}`);
      return;
    }
    navigate("/mypage/orders");
  };

  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>CART</p><h1>장바구니</h1><span>담아둔 상품을 한 번에 픽업 장소·시간을 선택해 주문하세요.</span></div>
      </section>
      <section className="section-wrap">
        {loading ? (
          <div className="order-loading"><LoaderCircle className="spin-icon" /> 장바구니를 불러오는 중입니다.</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h2>장바구니가 비어 있습니다.</h2>
            <p>마음에 드는 상품에서 "담기"를 눌러보세요.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 28, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {orderableItems.map((item) => (
                <div key={item.id} style={{ display: "flex", gap: 14, padding: 14, border: "1px solid var(--border)", borderRadius: 12, alignItems: "center" }}>
                  <img src={item.product?.image} alt={item.product?.name} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, background: "var(--muted)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 14, marginBottom: 4 }}>{item.product?.name}</strong>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>{formatPrice((item.deal?.dealPrice ?? 0) * item.quantity)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button type="button" onClick={() => void changeQuantity(item, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer" }}><Minus size={14} /></button>
                    <span style={{ minWidth: 20, textAlign: "center", fontSize: 14 }}>{item.quantity}</span>
                    <button type="button" onClick={() => void changeQuantity(item, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer" }}><Plus size={14} /></button>
                  </div>
                  <button type="button" onClick={() => void remove(item.id)} aria-label="삭제" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><Trash2 size={16} /></button>
                </div>
              ))}
              {unavailableItems.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>진행 중인 타임딜이 종료되어 지금은 주문할 수 없는 상품입니다.</p>
                  {unavailableItems.map((item) => (
                    <div key={item.id} style={{ display: "flex", gap: 14, padding: 14, border: "1px dashed var(--border)", borderRadius: 12, alignItems: "center", opacity: 0.6, marginBottom: 8 }}>
                      <img src={item.product?.image} alt={item.product?.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, background: "var(--muted)" }} />
                      <span style={{ flex: 1, fontSize: 13 }}>{item.product?.name ?? "삭제된 상품"}</span>
                      <button type="button" onClick={() => void remove(item.id)} aria-label="삭제" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 20, position: "sticky", top: 100 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 14px 0" }}>주문 정보</h2>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>픽업 장소</label>
              <select value={locationId} onChange={(event) => setLocationId(event.target.value)} style={{ width: "100%", height: 40, marginBottom: 12, borderRadius: 8, border: "1px solid var(--border)", padding: "0 10px" }}>
                <option value="">선택</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>수령 슬롯</label>
              <select value={slotId} onChange={(event) => setSlotId(event.target.value)} disabled={!locationId} style={{ width: "100%", height: 40, marginBottom: 12, borderRadius: 8, border: "1px solid var(--border)", padding: "0 10px" }}>
                <option value="">선택</option>
                {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.pickupDate} {slot.startTime}~{slot.endTime}</option>)}
              </select>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>결제 수단</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {(["on_site", "reservation_only", ...(isTossPaymentsConfigured ? ["card"] as const : [])] as const).map((method) => (
                  <label key={method} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input type="radio" name="payment" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                    {PAYMENT_LABELS[method]}
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>총 결제/예약 금액</span>
                <strong style={{ fontSize: 18, color: "var(--primary)" }}>{formatPrice(total)}</strong>
              </div>
              {error && <div className="order-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
              <button
                type="button"
                className="primary-button full"
                disabled={submitting || !orderableItems.length}
                onClick={() => void checkout()}
              >
                {submitting ? "주문 접수 중..." : "주문 접수하기"}
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
