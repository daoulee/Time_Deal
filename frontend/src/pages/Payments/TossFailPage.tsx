/**
 * 토스페이먼츠 결제창에서 결제가 취소되거나 실패하면 failUrl로 돌아오는 화면입니다.
 * 쿼리 파라미터의 에러 코드·메시지를 그대로 보여주고 같은 주문으로 결제를 다시 시도할 수 있게 합니다.
 */
import { XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";

export default function TossFailPage() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("message") ?? "결제가 취소되었거나 실패했습니다.";
  const orderId = searchParams.get("orderId");

  return <AppShell>
    <section className="toss-result">
      <XCircle size={44} className="toss-result-error" />
      <h1>결제를 완료하지 못했습니다</h1>
      <p>{message}</p>
      <div className="toss-result-actions">
        {orderId && <Link className="primary-button" to={`/payments/toss/checkout?orderId=${encodeURIComponent(orderId)}`}>다시 결제하기</Link>}
        <Link className="secondary-button" to="/mypage/orders">주문 내역으로 이동</Link>
      </div>
    </section>
  </AppShell>;
}
