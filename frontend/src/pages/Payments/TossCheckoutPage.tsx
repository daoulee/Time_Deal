/**
 * 카드 결제(payment_method=card)로 접수한 주문의 토스페이먼츠 결제위젯 화면입니다.
 * 주문 생성 직후 이 화면으로 이동해 결제수단·약관 위젯을 렌더링하고 결제창으로 리다이렉트합니다.
 * VITE_TOSS_CLIENT_KEY가 없거나 주문이 카드 결제 대기 상태가 아니면 조용히 깨지지 않고 안내를 보여줍니다.
 */
import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { AppShell } from "@/shared/layout/AppShell";
import { authClient } from "@/lib/auth";
import { formatPrice } from "@/shared/catalog";
import { getMyOrder, type Order } from "@/lib/api";
import { isTossPaymentsConfigured, loadTossPaymentsSdk } from "@/lib/toss-payments";

type Status = "loading" | "ready" | "requesting" | "error";

export default function TossCheckoutPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const { data: session } = authClient.useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!orderId) { setStatus("error"); setErrorMessage("주문 정보가 없습니다."); return; }
    let active = true;
    void getMyOrder(orderId).then((result) => {
      if (!active) return;
      if (!result.ok || !result.data?.order) { setStatus("error"); setErrorMessage(result.error?.message ?? "주문을 찾을 수 없습니다."); return; }
      const current = result.data.order;
      if (current.paymentMethod !== "card") { setStatus("error"); setErrorMessage("카드 결제 주문이 아닙니다."); return; }
      if (current.paymentStatus === "paid") { setStatus("error"); setErrorMessage("이미 결제가 완료된 주문입니다."); return; }
      if (current.paymentStatus !== "pending_payment") { setStatus("error"); setErrorMessage("결제를 진행할 수 없는 주문 상태입니다."); return; }
      setOrder(current);
    });
    return () => { active = false; };
  }, [orderId]);

  useEffect(() => {
    if (!order || !session?.user || initializedRef.current) return;
    if (!isTossPaymentsConfigured) { setStatus("error"); setErrorMessage("프론트 Toss 클라이언트 키(VITE_TOSS_CLIENT_KEY)가 설정되지 않았습니다."); return; }
    initializedRef.current = true;
    let active = true;
    void loadTossPaymentsSdk().then(async (tossPayments) => {
      if (!active) return;
      const widgets = tossPayments.widgets({ customerKey: session.user.id });
      widgetsRef.current = widgets;
      await widgets.setAmount({ currency: "KRW", value: order.totalAmount });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: "#toss-payment-method", variantKey: "DEFAULT" }),
        widgets.renderAgreement({ selector: "#toss-agreement", variantKey: "AGREEMENT" }),
      ]);
      if (active) setStatus("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "결제 UI를 불러오지 못했습니다.");
    });
    return () => { active = false; };
  }, [order, session?.user]);

  const handleRequestPayment = async () => {
    if (!order || !widgetsRef.current) return;
    setStatus("requesting");
    try {
      await widgetsRef.current.requestPayment({
        orderId: order.id,
        orderName: `타임딜 주문 ${order.orderNumber}`,
        successUrl: `${window.location.origin}/payments/toss/success`,
        failUrl: `${window.location.origin}/payments/toss/fail`,
        customerEmail: session?.user?.email ?? undefined,
        customerName: session?.user?.name ?? undefined,
      });
    } catch (error) {
      setStatus("ready");
      setErrorMessage(error instanceof Error ? error.message : "결제 요청에 실패했습니다.");
    }
  };

  return <AppShell>
    <section className="toss-checkout">
      <div className="toss-checkout-heading"><p>TOSS PAYMENTS · TEST</p><h1>카드 결제</h1>{order && <span>{order.orderNumber} · {formatPrice(order.totalAmount)}</span>}</div>
      {status === "loading" && <div className="toss-checkout-loading"><LoaderCircle className="spin-icon" size={22} /> 결제 정보를 불러오는 중입니다.</div>}
      {status === "error" && <div className="order-error" role="alert">{errorMessage} <Link to="/mypage/orders">주문 내역으로 이동</Link></div>}
      {order && status !== "error" && <div className="toss-checkout-widgets">
        <div id="toss-payment-method" />
        <div id="toss-agreement" />
        <button type="button" className="primary-button full" disabled={status !== "ready"} onClick={() => void handleRequestPayment()}>
          {status === "requesting" ? <><LoaderCircle size={17} className="spin-icon" /> 결제창으로 이동 중</> : `${formatPrice(order.totalAmount)} 결제하기`}
        </button>
        <p className="integration-note">테스트 모드 결제입니다. 실제 카드가 승인되지 않으며 <b>토스 테스트 카드 번호</b>로만 결제를 진행할 수 있습니다.</p>
      </div>}
    </section>
  </AppShell>;
}
