/**
 * 고객·판매자 유형 문의를 로그인 사용자가 실제 API로 접수하는 화면입니다.
 * 입력 검증·제출·성공·실패 상태를 표시하고 비로그인 사용자는 인증 화면으로 안내합니다.
 */
import { type FormEvent, useState } from "react";
import { Headphones, Store } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { HelpCenterShell } from "@/shared/layout/HelpCenterShell";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { authClient } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
const CATEGORIES = ["general", "order", "account", "product", "bulk"] as const;
export default function InquiryPage() {
  const [searchParams] = useSearchParams();
  const isBulk = searchParams.get("category") === "bulk";
  const initialCategory = CATEGORIES.find((value) => value === searchParams.get("category")) ?? "general";
  const { data: session } = authClient.useSession(); const [type, setType] = useState<"customer" | "seller">("customer"); const [category, setCategory] = useState<string>(initialCategory); const [subject, setSubject] = useState(""); const [message, setMessage] = useState(""); const [status, setStatus] = useState(""); const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); setStatus(""); const response = await apiFetch("/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience: type, category, subject, message }) }); setSubmitting(false); if (response.ok) { setSubject(""); setMessage(""); setStatus("문의가 접수되었습니다. 마이페이지에서 답변 상태를 확인할 수 있습니다."); } else setStatus("문의 접수에 실패했습니다. 입력과 로그인 상태를 확인해 주세요."); };
  return <AppShell><HelpCenterShell>
    <div className="help-center-header inquiry-header">
      <div><h1>{isBulk ? "대량주문 문의" : "1:1 문의"}</h1><span>담당 유형에 맞게 문의를 접수하고 답변 상태를 확인하세요.</span></div>
      <StatusBadge type="live">문의 API 연결</StatusBadge>
    </div>
    <div className="inquiry-layout">
      <div className="inquiry-choice">
        <button className={type === "customer" ? "active" : ""} onClick={() => setType("customer")} type="button"><Headphones /><span><b>고객 문의</b><small>구매, 참여, 계정, 리뷰</small></span></button>
        <button className={type === "seller" ? "active" : ""} onClick={() => setType("seller")} type="button"><Store /><span><b>판매자 문의</b><small>입점, 상품 등록, 운영</small></span></button>
      </div>
      {!session?.user ? <div className="empty-state"><h2>로그인이 필요합니다.</h2><Link className="primary-button" to="/auth">로그인</Link></div> : <form className="inquiry-form" onSubmit={submit}>
        <div className="form-heading"><h2>{type === "customer" ? "고객 문의 작성" : "판매자 문의 작성"}</h2><p>필수 정보를 입력하면 담당자에게 안전하게 전달됩니다.</p></div>
        {status && <div className="order-notice" role="status">{status}</div>}
        <label>문의 유형<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="general">일반</option><option value="order">주문·픽업</option><option value="account">계정·보안</option><option value="product">상품·입점</option><option value="bulk">대량주문 문의</option></select></label>
        <label>제목<input value={subject} minLength={2} maxLength={120} onChange={(event) => setSubject(event.target.value)} required /></label>
        <label>내용<textarea rows={6} value={message} minLength={5} maxLength={3000} onChange={(event) => setMessage(event.target.value)} required /></label>
        <button type="submit" className="primary-button full" disabled={submitting}>{submitting ? "접수 중..." : "문의 접수"}</button>
      </form>}
    </div>
  </HelpCenterShell></AppShell>;
}
