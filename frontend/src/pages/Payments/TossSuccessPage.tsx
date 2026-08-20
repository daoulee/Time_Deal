/**
 * 토스페이먼츠 결제창이 성공적으로 끝나면 successUrl로 돌아오는 화면입니다.
 * 쿼리 파라미터의 paymentKey/orderId/amount를 그대로 백엔드 승인 API에 전달해 결제를 최종 확정합니다.
 * 승인 API를 호출하기 전까지는 결제가 완료된 것이 아니므로 이 화면이 반드시 승인을 트리거해야 합니다.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { confirmTossPayment } from "@/lib/api";

type Status = "confirming" | "done" | "error";

export default function TossSuccessPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("confirming");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const paymentKey = searchParams.get("paymentKey");
    const amount = Number(searchParams.get("amount"));
    if (!orderId || !paymentKey || !Number.isFinite(amount)) { setStatus("error"); setMessage("결제 확인 정보가 올바르지 않습니다."); return; }
    let active = true;
    void confirmTossPayment({ orderId, paymentKey, amount }).then((result) => {
      if (!active) return;
      if (result.ok) setStatus("done");
      else { setStatus("error"); setMessage(result.error?.message ?? "결제 승인에 실패했습니다."); }
    });
    return () => { active = false; };
  }, [searchParams]);

  return <AppShell>
    <section className="toss-result">
      {status === "confirming" && <><LoaderCircle className="spin-icon" size={40} /><h1>결제를 승인하는 중입니다</h1><p>잠시만 기다려 주세요.</p></>}
      {status === "done" && <><CheckCircle2 size={44} className="toss-result-success" /><h1>결제가 완료됐습니다</h1><p>테스트 모드 결제이며 실제 카드가 승인되지 않았습니다.</p><Link className="primary-button" to="/mypage/orders">주문 내역 보기</Link></>}
      {status === "error" && <><XCircle size={44} className="toss-result-error" /><h1>결제 승인에 실패했습니다</h1><p>{message}</p><Link className="secondary-button" to="/mypage/orders">주문 내역으로 이동</Link></>}
    </section>
  </AppShell>;
}
