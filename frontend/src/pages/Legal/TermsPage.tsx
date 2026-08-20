/**
 * 이용약관 정적 안내 페이지입니다. 별도 편집 기능은 없고 운영팀이 코드로 관리하는 고정 콘텐츠입니다.
 */
import { AppShell } from "@/shared/layout/AppShell";

const ARTICLES = [
  { title: "제1조 (목적)", body: "이 약관은 (주)타임딜컴퍼니(이하 '회사')가 운영하는 타임딜 서비스의 이용조건 및 절차, 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다." },
  { title: "제2조 (정의)", body: "'서비스'란 회사가 제공하는 동네 소상공인 상품 공동구매 및 픽업 중개 서비스를 말합니다. '회원'이란 이 약관에 동의하고 서비스를 이용하는 자를 말하며, '판매자'란 서비스에 상품을 등록해 판매하는 회원을 말합니다." },
  { title: "제3조 (약관의 효력 및 변경)", body: "이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다. 회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시해 사전 공지합니다." },
  { title: "제4조 (서비스의 제공 및 변경)", body: "회사는 타임딜 등록·참여, 픽업 예약, 결제, 커뮤니티 등의 서비스를 제공합니다. 회사는 운영상·기술상 필요에 따라 제공하는 서비스의 내용을 변경할 수 있습니다." },
  { title: "제5조 (회원가입 및 탈퇴)", body: "회원가입은 이용자가 약관 내용에 동의하고 회사가 정한 가입 양식에 따라 정보를 기입한 후 이용 신청을 함으로써 성립합니다. 회원은 언제든지 마이페이지를 통해 탈퇴를 요청할 수 있습니다." },
  { title: "제6조 (판매자의 의무)", body: "판매자는 등록 상품의 정보를 정확히 기재해야 하며, 확정된 타임딜은 정해진 픽업 일정에 성실히 이행해야 합니다. 허위 상품 정보 등록, 부당한 주문 취소 등은 판매자 계정 제재 사유가 됩니다." },
  { title: "제7조 (주문 및 결제)", body: "회원은 서비스 내 제공되는 결제 수단(현장 결제, 예약, 카드 결제)을 이용해 주문할 수 있습니다. 목표 참여 인원이 모이지 않아 딜이 성립되지 않을 경우 결제는 자동 취소됩니다." },
  { title: "제8조 (면책조항)", body: "회사는 천재지변, 통신 장애 등 회사의 귀책사유가 없는 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다. 회사는 회원 간 또는 회원과 판매자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없습니다." },
];

export default function TermsPage() {
  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>TERMS</p><h1>이용약관</h1><span>타임딜 서비스 이용에 관한 회사와 회원의 권리·의무를 안내합니다.</span></div>
      </section>
      <section className="section-wrap">
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 28 }}>시행일자 2026년 1월 1일</p>
          {ARTICLES.map((article) => (
            <div key={article.title} style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 16, color: "var(--foreground)", margin: "0 0 8px" }}>{article.title}</h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.8, margin: 0 }}>{article.body}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
