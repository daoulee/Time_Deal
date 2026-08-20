/**
 * 개인정보처리방침 정적 안내 페이지입니다. 별도 편집 기능은 없고 운영팀이 코드로 관리하는 고정 콘텐츠입니다.
 */
import { AppShell } from "@/shared/layout/AppShell";

const SECTIONS = [
  { title: "1. 수집하는 개인정보 항목", body: "회원가입 시 이름, 이메일, 비밀번호를 수집합니다. 판매자 가입 시 사업자명, 사업자등록번호를 추가로 수집합니다. 주문·픽업 과정에서 수령 주소, 연락처가 추가로 수집될 수 있습니다." },
  { title: "2. 개인정보의 수집 및 이용목적", body: "회원 식별 및 서비스 이용, 타임딜 참여 및 픽업 처리, 결제 및 정산, 고객 문의 응대, 부정 이용 방지를 위해 개인정보를 이용합니다." },
  { title: "3. 개인정보의 보유 및 이용기간", body: "회원 탈퇴 시 지체 없이 파기하는 것을 원칙으로 하되, 전자상거래법 등 관계 법령에 따라 보존이 필요한 거래 기록은 법정 기간 동안 보관합니다." },
  { title: "4. 개인정보의 제3자 제공", body: "회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않으며, 픽업 처리를 위해 필요한 최소한의 정보만 해당 판매자에게 제공합니다." },
  { title: "5. 개인정보 처리 위탁", body: "회사는 안정적인 서비스 제공을 위해 결제 처리(토스페이먼츠), 데이터베이스 호스팅(Supabase) 업무를 외부에 위탁하고 있으며, 위탁받은 업체가 개인정보를 안전하게 관리하도록 필요한 사항을 규정하고 있습니다." },
  { title: "6. 이용자의 권리와 행사 방법", body: "이용자는 언제든지 마이페이지에서 본인의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴를 통해 개인정보 수집·이용 동의를 철회할 수 있습니다." },
  { title: "7. 개인정보의 안전성 확보 조치", body: "회사는 비밀번호 암호화, 접근권한 관리, 접속기록 보관 등 개인정보를 안전하게 관리하기 위한 기술적·관리적 조치를 취하고 있습니다." },
  { title: "8. 개인정보 보호책임자", body: "개인정보 관련 문의는 고객센터(help@timedeal.example) 또는 1:1 문의를 통해 접수해 주시면 신속히 답변드리겠습니다." },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>PRIVACY</p><h1>개인정보처리방침</h1><span>타임딜은 회원의 개인정보를 소중히 다루며 관련 법령을 준수합니다.</span></div>
      </section>
      <section className="section-wrap">
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 28 }}>시행일자 2026년 1월 1일</p>
          {SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 16, color: "var(--foreground)", margin: "0 0 8px" }}>{section.title}</h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.8, margin: 0 }}>{section.body}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
