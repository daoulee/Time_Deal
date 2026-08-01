/**
 * 고객 문의와 상품 등록 판매자 문의를 구분해 접수하는 문의 화면입니다.
 * 백엔드 Inquiry 모듈의 audience 기반 조회·작성 API를 사용합니다.
 * 로그인·입력 검증 후에만 저장 요청이 성공하도록 경계를 유지합니다.
 */
import { Headphones, Store } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { StatusBadge } from "@/shared/components/StatusBadge";

export default function InquiryPage() {
  const [type, setType] = useState<"customer" | "seller">("customer");
  return <AppShell><section className="page-hero compact"><div><p>HELP CENTER</p><h1>문의사항</h1><span>고객과 판매자의 문의 내용을 분리해 담당 흐름을 명확히 합니다.</span></div><StatusBadge type="ready">제출 API 준비 중</StatusBadge></section><section className="section-wrap inquiry-layout"><div className="inquiry-choice"><button className={type === "customer" ? "active" : ""} onClick={() => setType("customer")} type="button"><Headphones /><span><b>고객 문의</b><small>구매, 참여, 계정, 리뷰</small></span></button><button className={type === "seller" ? "active" : ""} onClick={() => setType("seller")} type="button"><Store /><span><b>판매자 문의</b><small>입점, 상품 등록, 정산</small></span></button><div className="response-guide"><strong>응답 안내</strong><p>현재 접수 기능은 UI 데모입니다. 로그인 사용자 문의는 향후 <code>POST /api/inquiries</code>로 연결합니다.</p></div></div><form className="inquiry-form" onSubmit={(event) => event.preventDefault()}><div className="form-heading"><span>{type === "customer" ? "CUSTOMER" : "SELLER"}</span><h2>{type === "customer" ? "고객 문의 작성" : "판매자 문의 작성"}</h2><p>필수 정보를 입력하면 담당 유형에 맞춰 분류됩니다.</p></div><label>문의 유형<select defaultValue=""><option value="" disabled>문의 유형을 선택하세요</option><option>{type === "customer" ? "공동구매 참여" : "입점 및 상품 등록"}</option><option>{type === "customer" ? "계정 및 비밀번호" : "주문 및 통계"}</option><option>기타</option></select></label><label>제목<input placeholder="문의 제목" /></label><label>내용<textarea rows={6} placeholder="확인이 필요한 내용을 자세히 적어주세요." /></label><button type="submit" className="primary-button full" disabled>문의 접수 · 연동 준비 중</button></form></section></AppShell>;
}
