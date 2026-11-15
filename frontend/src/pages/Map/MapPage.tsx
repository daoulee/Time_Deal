/**
 * 홈 화면의 "지도에서 찾기" 버튼이 연결되는 매장 찾기 화면입니다.
 * Google Maps 과금을 막기 위해 지도를 그리지 않고, 픽업 매장 목록과
 * 네이버·카카오 지도 바로가기 링크(외부 앱에서 열기, API 비용 없음)만 보여줍니다.
 */
import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, Navigation, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { getPickupLocations, type PickupLocation } from "@/lib/api";
import { getCatalog } from "@/shared/services/catalog";
import type { Product } from "@/shared/catalog";
import { ProductCard } from "@/shared/components/ProductCard";

const NECESSITIES_CATEGORY = "생활용품·뷰티";

const naverMap = (q: string) => `https://map.naver.com/p/search/${encodeURIComponent(q)}`;
const kakaoMap = (q: string) => `https://map.kakao.com/link/search/${encodeURIComponent(q)}`;

export default function MapPage() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<PickupLocation[] | null>(null);
  const [necessities, setNecessities] = useState<Product[]>([]);

  useEffect(() => {
    void getPickupLocations().then((result) => setLocations(result.data?.locations.filter((loc) => loc.isActive) ?? []));
    void getCatalog().then((result) => setNecessities(result.products.filter((product) => product.category === NECESSITIES_CATEGORY)));
  }, []);

  const sortedStores = useMemo(() => [...(locations ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ko")), [locations]);
  const previewNecessities = necessities.slice(0, 4);

  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>STORES</p><h1>픽업 매장 찾기</h1><span>편의점·마트에서 생필품을 바로 픽업할 수 있는 우리 동네 매장이에요. 위치는 네이버·카카오 지도에서 확인하세요.</span></div>
      </section>
      <section className="section-wrap map-page">
        {locations === null && <div className="empty-state">매장 목록을 불러오는 중입니다.</div>}
        {locations !== null && !sortedStores.length && (
          <div className="empty-state">
            <MapPin size={30} />
            <h2>픽업 가능한 매장이 아직 없습니다.</h2>
          </div>
        )}
        {sortedStores.length > 0 && (
          <div className="map-store-list" aria-label="주변 픽업 매장 목록" style={{ display: "grid", gap: 12 }}>
            {sortedStores.map((store) => (
              <div key={store.id} className="map-store-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, borderRadius: 9, background: "var(--muted)" }}>
                  <Store size={26} />
                </div>
                <div>
                  <strong>{store.name}</strong>
                  <span className="map-store-deal">{store.description}</span>
                  <span className="map-store-address"><Navigation size={12} /> {store.address}</span>
                  <span style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 13 }}>
                    <a href={naverMap(store.address || store.name)} target="_blank" rel="noopener noreferrer">네이버 지도</a>
                    <a href={kakaoMap(store.address || store.name)} target="_blank" rel="noopener noreferrer">카카오맵</a>
                  </span>
                </div>
                <button
                  type="button"
                  className="map-store-link"
                  onClick={() => navigate(`/products?category=${encodeURIComponent(NECESSITIES_CATEGORY)}`)}
                >
                  생필품 보러가기
                </button>
              </div>
            ))}
          </div>
        )}

        {previewNecessities.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock3 size={18} /> 이 매장들에서 픽업할 수 있는 생필품
              </h2>
              <button
                type="button"
                onClick={() => navigate(`/products?category=${encodeURIComponent(NECESSITIES_CATEGORY)}`)}
                style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700, cursor: "pointer", background: "none", border: 0 }}
              >
                전체보기
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {previewNecessities.map((product) => (
                <ProductCard key={`${product.id}-${product.dealId ?? "catalog"}`} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
