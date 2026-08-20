/**
 * 이메일무단수집거부 정적 안내 페이지입니다. 별도 편집 기능은 없고 운영팀이 코드로 관리하는 고정 콘텐츠입니다.
 */
import { AppShell } from "@/shared/layout/AppShell";
import { ShieldAlert } from "lucide-react";

export default function EmailPolicyPage() {
  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>EMAIL POLICY</p><h1>이메일무단수집거부</h1><span>게시된 이메일 주소가 무단으로 수집되는 것을 거부합니다.</span></div>
      </section>
      <section className="section-wrap">
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 14, padding: "20px 22px", border: "1px solid var(--border)", borderRadius: 14, background: "var(--card)", marginBottom: 28 }}>
            <ShieldAlert size={22} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.8 }}>
              본 웹사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여 무단으로 수집되는 것을 거부하며,
              이를 위반 시 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 의해 형사처벌됨을 유념하시기 바랍니다.
            </p>
          </div>
          <div style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 16, color: "var(--foreground)", margin: "0 0 8px" }}>이메일 무단 수집 거부 안내</h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              타임딜 웹사이트에 게시된 이메일 주소(help@timedeal.example 등)는 이용자에게 정보를 제공하기 위해 게시된 것으로,
              이를 자동으로 수집하는 프로그램이나 그 밖의 기술적 장치를 이용하여 수집하는 행위를 금지합니다.
            </p>
          </div>
          <div style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 16, color: "var(--foreground)", margin: "0 0 8px" }}>위반 시 법적 근거</h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 제50조의2에 따라, 전자우편주소의 무단 수집·판매·유통 및 이를 이용한 정보 전송 행위는 처벌 대상이 됩니다.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
