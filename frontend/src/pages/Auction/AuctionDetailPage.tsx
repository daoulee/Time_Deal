/**
 * 직판장 경매 상세·실시간 입찰·낙찰 후 5분 결제 타임아웃 및 수령 방식 선택 화면입니다.
 * 웹소켓 없이 짧은 폴링으로 최신 상태를 반영하고, 결제 타임아웃 시 서버가 자동으로 재경매 처리합니다.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Gavel, MapPin, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layout/AppShell";
import { authClient } from "@/lib/auth";
import { checkoutAuction, getAuction, placeAuctionBid } from "@/lib/api";
import { AUCTION_STATUS_LABEL, DELIVERY_LABEL, feeRateLabel, formatCountdown, type AuctionItem, type DeliveryMethod } from "@/shared/auction";
import { formatPrice } from "@/shared/catalog";

const BID_STEPS = [1000, 5000, 10000];

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [auction, setAuction] = useState<AuctionItem | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [parcelPayment, setParcelPayment] = useState<"prepaid" | "cod">("prepaid");
  const [checkingOut, setCheckingOut] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const result = await getAuction(id);
    if (result.ok && result.data) { setAuction(result.data.auction); setRestricted(result.data.youAreRestricted); setIsWinner(result.data.youAreWinner); }
    else setError(result.error?.message ?? "경매를 불러오지 못했습니다.");
  }, [id]);

  useEffect(() => { void load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => { const timer = setInterval(() => { void load(); }, 4000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { const timer = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const paymentSecondsLeft = auction?.paymentDeadline ? Math.max(0, Math.floor((new Date(auction.paymentDeadline).getTime() - nowMs) / 1000)) : null;
  useEffect(() => { if (paymentSecondsLeft === 0) void load(); }, [paymentSecondsLeft, load]);

  const minBid = useMemo(() => { if (!auction) return 0; return auction.highestBidderId || auction.currentPrice > auction.startPrice ? auction.currentPrice + auction.minBidIncrement : auction.currentPrice; }, [auction]);
  const winnerName = useMemo(() => {
    if (!auction?.highestBidderId) return null;
    const winningBid = auction.bids.find((entry) => entry.userId === auction.highestBidderId);
    return winningBid?.userName ?? null;
  }, [auction]);

  const bid = async (amount: number) => {
    if (!id || !session?.user) { navigate("/auth"); return; }
    setBidding(true); setError(null);
    const result = await placeAuctionBid(id, amount);
    setBidding(false);
    if (!result.ok) { setError(result.error?.message ?? "입찰에 실패했습니다."); return; }
    toast.success(`${formatPrice(amount)}에 입찰했습니다.`);
    await load();
  };

  const checkout = async () => {
    if (!id) return;
    if (deliveryMethod !== "PICKUP" && !deliveryAddress.trim()) { setError("배송 주소를 입력하세요."); return; }
    setCheckingOut(true); setError(null);
    const result = await checkoutAuction(id, { deliveryMethod, deliveryAddress: deliveryMethod === "PICKUP" ? undefined : deliveryAddress, parcelPayment: deliveryMethod === "PARCEL" ? parcelPayment : undefined });
    setCheckingOut(false);
    if (!result.ok) { setError(result.error?.message ?? "결제 처리에 실패했습니다."); return; }
    toast.success("결제가 완료되어 낙찰 대금이 에스크로에 안전하게 보관되었습니다.");
    await load();
  };

  if (loading) return <AppShell><div className="empty-state page-empty">경매를 불러오는 중입니다.</div></AppShell>;
  if (!auction) return <AppShell><div className="empty-state page-empty"><h1>경매를 찾을 수 없습니다.</h1></div></AppShell>;

  const isLive = auction.status === "live";
  const showPaymentModal = auction.status === "payment_pending" && isWinner && paymentSecondsLeft !== null && paymentSecondsLeft > 0;

  return (
    <AppShell>
      <section className="product-detail auction-detail">
        <div className="detail-gallery"><img src={auction.image} alt={auction.title} /><span>{AUCTION_STATUS_LABEL[auction.status]}</span></div>
        <div className="detail-info">
          <div className="detail-labels"><span className="category-pill">{auction.origin}</span><span className="category-pill">{feeRateLabel(auction)}</span></div>
          <h1>{auction.title}</h1>
          <p className="detail-description">{auction.description || "산지에서 바로 올라온 신선한 수산물을 실시간 경매로 만나보세요."}</p>

          <div className="detail-price"><span>현재가</span><strong>{formatPrice(auction.currentPrice)}</strong></div>

          {isLive && <p className="deal-detail-countdown">경매 마감까지 {formatCountdown(auction.endsAt, nowMs)}</p>}
          {!isLive && winnerName && <p className="deal-detail-countdown">🎉 낙찰자: <strong>{winnerName}</strong>{isWinner ? " (나)" : ""}</p>}

          <div className="auction-escrow-info">
            <ShieldCheck size={18} />
            <div>
              <b>플랫폼 에스크로 안전 결제</b>
              <p>낙찰 대금은 판매자에게 즉시 입금되지 않고 플랫폼이 안전 보관합니다. 물품 수령 후 [구매 확정]을 누르면 정산이 시작되며, 정산은 구매 확정일 기준 최소 1일~최대 7영업일 이내 지급됩니다.</p>
            </div>
          </div>

          {restricted && <div className="order-error" role="alert">미결제 이력으로 이 상품에는 다시 입찰할 수 없습니다.</div>}
          {error && <div className="order-error" role="alert">{error}</div>}

          {isLive && !restricted && (
            !session?.user ? <div className="order-login-prompt"><Gavel size={20} /><div><strong>입찰하려면 로그인이 필요합니다.</strong></div><button className="secondary-button" onClick={() => navigate("/auth")}>로그인</button></div> : (
              <div className="auction-bid-actions">
                <p>최소 입찰가 {formatPrice(minBid)}</p>
                <div className="auction-bid-buttons">
                  {BID_STEPS.map((step) => <button key={step} type="button" className="secondary-button" disabled={bidding} onClick={() => void bid(Math.max(minBid, auction.currentPrice + step))}>+{formatPrice(step)}</button>)}
                  <button type="button" className="primary-button" disabled={bidding} onClick={() => void bid(minBid)}>{bidding ? "입찰 중..." : `${formatPrice(minBid)} 입찰`}</button>
                </div>
              </div>
            )
          )}

          <div className="auction-timeline">
            <h2>입찰 타임라인</h2>
            {auction.bids.length === 0 ? <p className="muted-copy">아직 입찰이 없습니다.</p> : <ul>{auction.bids.map((entry, index) => <li key={`${entry.userId}-${entry.bidTime}-${index}`}><span>{entry.userId === auction.sellerId ? "현장 호가 (판매자 등록)" : entry.userName}</span><strong>{formatPrice(entry.amount)}</strong><small>{new Date(entry.bidTime).toLocaleTimeString("ko-KR")}</small></li>)}</ul>}
          </div>
        </div>
      </section>

      {showPaymentModal && (
        <div className="auction-payment-modal-backdrop">
          <div className="auction-payment-modal">
            <h2>{session?.user?.name ? `${session.user.name}님, 낙찰을 축하합니다!` : "낙찰을 축하합니다!"}</h2>
            <p className="auction-payment-countdown">결제 남은 시간 <strong>{formatCountdown(auction.paymentDeadline!, nowMs)}</strong></p>
            <p className="muted-copy">5분 이내 결제하지 않으면 낙찰이 자동 취소되고 이 상품에 재입찰할 수 없습니다.</p>

            <fieldset className="payment-method">
              <legend>수령 방식</legend>
              {auction.deliveryOptions.allowPickup && <label><input type="radio" name="delivery" checked={deliveryMethod === "PICKUP"} onChange={() => setDeliveryMethod("PICKUP")} /> {DELIVERY_LABEL.PICKUP} (무료)</label>}
              <label><input type="radio" name="delivery" checked={deliveryMethod === "PARCEL"} onChange={() => setDeliveryMethod("PARCEL")} /> {DELIVERY_LABEL.PARCEL} (+{formatPrice(auction.deliveryOptions.parcelFee)})</label>
              {auction.deliveryOptions.allowQuick && <label><input type="radio" name="delivery" checked={deliveryMethod === "QUICK"} onChange={() => setDeliveryMethod("QUICK")} /> {DELIVERY_LABEL.QUICK} (착불)</label>}
            </fieldset>

            {deliveryMethod === "PICKUP" && auction.deliveryOptions.pickupLocation && <p className="muted-copy"><MapPin size={14} /> {auction.deliveryOptions.pickupLocation}</p>}
            {deliveryMethod === "PARCEL" && <>
              <label className="check-label"><input type="radio" checked={parcelPayment === "prepaid"} onChange={() => setParcelPayment("prepaid")} /> 선결제 (+{formatPrice(auction.deliveryOptions.parcelFee)})</label>
              <label className="check-label"><input type="radio" checked={parcelPayment === "cod"} onChange={() => setParcelPayment("cod")} /> 착불</label>
              <input type="text" placeholder="배송지 주소" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} />
            </>}
            {deliveryMethod === "QUICK" && <>
              <p className="muted-copy"><Truck size={14} /> 배송비는 착불로 기사님께 결제됩니다.</p>
              <input type="text" placeholder="배송지 주소" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} />
            </>}

            <div className="detail-price"><span>결제 금액</span><strong>{formatPrice(auction.currentPrice + (deliveryMethod === "PARCEL" && parcelPayment === "prepaid" ? auction.deliveryOptions.parcelFee : 0))}</strong></div>
            <button type="button" className="primary-button full" disabled={checkingOut} onClick={() => void checkout()}>{checkingOut ? "결제 처리 중..." : "결제하고 에스크로에 안전 보관"}</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
