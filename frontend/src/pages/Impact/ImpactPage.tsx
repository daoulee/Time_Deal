/**
 * 실제 완료된 주문 데이터로 집계한 공익 임팩트(소비자 절약액·소상공인 폐기 예방)를 보여주는 공개 페이지입니다.
 * 정가는 주문 시점 값을 따로 저장하지 않아 상품의 현재 정가로 근사 계산합니다.
 */
import { useEffect, useState } from "react";
import { Heart, PackageCheck, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { formatPrice } from "@/shared/catalog";
import { getImpactStats, type ImpactStats } from "@/lib/api";

export default function ImpactPage() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getImpactStats().then((result) => {
      if (result.ok) setStats(result.data);
      setLoading(false);
    });
  }, []);

  const cards = [
    { icon: Heart, label: "이웃들이 아낀 금액", value: stats ? formatPrice(stats.totalSavings) : "-", desc: "정가 대비 할인가로 구매해 절약한 총액입니다." },
    { icon: PackageCheck, label: "구제된 상품 수", value: stats ? `${stats.rescuedItems.toLocaleString("ko-KR")}개` : "-", desc: "마감 전 타임딜로 판매되어 폐기를 면한 상품 수량입니다." },
    { icon: ShieldCheck, label: "함께한 동네 가게", value: stats ? `${stats.participatingSellers.toLocaleString("ko-KR")}곳` : "-", desc: "타임딜에 참여해 재고 손실을 줄인 소상공인 수입니다." },
    { icon: Users, label: "함께한 이웃", value: stats ? `${stats.participatingBuyers.toLocaleString("ko-KR")}명` : "-", desc: "타임딜을 통해 실제로 물건을 픽업한 고객 수입니다." },
  ];

  return (
    <AppShell>
      <section className="page-hero compact">
        <div>
          <p>OUR IMPACT</p>
          <h1>우리의 임팩트</h1>
          <span>타임딜은 소상공인의 폐기 손실을 줄이고, 이웃의 장바구니 물가 부담을 낮추는 지역 상생 플랫폼입니다. 아래 수치는 실제 수령 완료된 주문만 집계한 실적입니다.</span>
        </div>
      </section>
      <section className="section-wrap">
        {loading ? (
          <div className="empty-state page-empty">임팩트 데이터를 불러오는 중입니다.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {cards.map(({ icon: Icon, label, value, desc }) => (
              <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <Icon size={22} color="var(--primary)" />
                <strong style={{ fontSize: 26, marginTop: 4 }}>{value}</strong>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
                <p className="muted-copy" style={{ fontSize: 12, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
