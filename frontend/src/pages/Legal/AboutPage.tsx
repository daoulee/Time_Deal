/**
 * 회사소개 정적 안내 페이지입니다. 별도 편집 기능은 없고 운영팀이 코드로 관리하는 고정 콘텐츠입니다.
 */
import { AppShell } from "@/shared/layout/AppShell";

const VALUES = [
  { title: "동네와 함께", desc: "동네 소상공인의 마감 재고를 이웃들과 함께 나누며 지역 상권을 살립니다." },
  { title: "신선함 우선", desc: "당일 픽업을 원칙으로, 재고를 오래 묵히지 않고 신선한 상태로 전달합니다." },
  { title: "투명한 거래", desc: "판매자 정산, 수수료, 결제 내역을 투명하게 공개하고 관리합니다." },
];

export default function AboutPage() {
  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>ABOUT</p><h1>회사소개</h1><span>동네 소상공인과 이웃을 연결하는 하이퍼로컬 타임딜, 타임딜컴퍼니입니다.</span></div>
      </section>
      <section className="section-wrap">
        <div style={{ maxWidth: 820, margin: "0 auto", color: "var(--muted-foreground)", lineHeight: 1.8, fontSize: 15 }}>
          <p>
            타임딜은 동네 가게의 마감 임박 재고를 이웃들이 함께 모여 확정 할인가로 구매하는 하이퍼로컬 공동구매 서비스입니다.
            2026년 서울 성동구 성수동에서 시작해, 소상공인의 재고 부담은 줄이고 이웃들에게는 합리적인 가격의 신선한 상품을 전달하는 것을 목표로 운영하고 있습니다.
          </p>
          <h2 style={{ fontSize: 20, color: "var(--foreground)", margin: "32px 0 14px" }}>우리가 지키는 가치</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
            {VALUES.map((value) => (
              <div key={value.title} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", background: "var(--card)" }}>
                <strong style={{ display: "block", fontSize: 15, color: "var(--foreground)", marginBottom: 6 }}>{value.title}</strong>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{value.desc}</span>
              </div>
            ))}
          </div>
          <h2 style={{ fontSize: 20, color: "var(--foreground)", margin: "32px 0 14px" }}>회사 정보</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {[
                ["상호", "(주)타임딜컴퍼니"],
                ["팀", "연리 · 엄태훈 · 최다울 · 이동교"],
                ["주소", "서울특별시 성동구 성수이로 20길 16, 4층 (성수동2가)"],
                ["대표전화", "1588-0000 (평일 09:00~18:00)"],
                ["이메일", "help@timedeal.example"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ width: 140, textAlign: "left", padding: "10px 0", color: "var(--foreground)", fontWeight: 700 }}>{label}</th>
                  <td style={{ padding: "10px 0" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
