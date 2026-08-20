/**
 * 홈 화면의 "지도에서 찾기" 버튼이 연결되는 지도 화면입니다.
 * 실제 픽업 매장(편의점·마트 등)을 Google Geocoding으로 지도에 표시하고,
 * 그 매장에서 픽업 가능한 생필품(생활용품·뷰티) 실제 상품과 연결해서 보여줍니다.
 * VITE_GOOGLE_MAPS_API_KEY가 없으면 조용히 깨지지 않고 설정 필요 안내를 보여줍니다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, MapPin, Navigation, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps-loader";
import { getPickupLocations, type PickupLocation } from "@/lib/api";
import { getCatalog } from "@/shared/services/catalog";
import type { Product } from "@/shared/catalog";
import { ProductCard } from "@/shared/components/ProductCard";

const NECESSITIES_CATEGORY = "생활용품·뷰티";
const SEONGSU_CENTER = { lat: 37.5445, lng: 127.0562 };

type GeoStore = PickupLocation & { lat: number; lng: number };

export default function MapPage() {
  const navigate = useNavigate();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [locations, setLocations] = useState<PickupLocation[] | null>(null);
  const [necessities, setNecessities] = useState<Product[]>([]);
  const [stores, setStores] = useState<GeoStore[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void getPickupLocations().then((result) => setLocations(result.data?.locations.filter((loc) => loc.isActive) ?? []));
    void getCatalog().then((result) => setNecessities(result.products.filter((product) => product.category === NECESSITIES_CATEGORY)));
  }, []);

  useEffect(() => {
    if (locations === null) return;
    if (!locations.length) { setStatus("error"); setErrorMessage("픽업 가능한 매장이 아직 등록되지 않았습니다."); return; }
    if (!isGoogleMapsConfigured) { setStatus("error"); setErrorMessage("프론트 Google Maps API 키(VITE_GOOGLE_MAPS_API_KEY)가 설정되지 않았습니다."); return; }
    let active = true;
    void loadGoogleMaps().then(async (maps) => {
      if (!active || !mapNodeRef.current) return;
      const geocoder = new maps.Geocoder();
      const geocoded: GeoStore[] = [];
      for (const location of locations) {
        try {
          const result = await geocoder.geocode({ address: location.address });
          const position = result.results[0]?.geometry.location;
          if (position) geocoded.push({ ...location, lat: position.lat(), lng: position.lng() });
        } catch {
          // 주소를 좌표로 바꾸지 못한 매장은 지도에서만 제외하고 계속 진행합니다.
        }
      }
      if (!active) return;
      if (!geocoded.length) { setStatus("error"); setErrorMessage("매장 주소를 지도 좌표로 변환하지 못했습니다."); return; }

      const map = new maps.Map(mapNodeRef.current, { center: SEONGSU_CENTER, zoom: 14, disableDefaultUI: false, streetViewControl: false, fullscreenControl: false });
      mapRef.current = map;
      const infoWindow = new maps.InfoWindow();
      infoWindowRef.current = infoWindow;
      geocoded.forEach((store) => {
        const marker = new maps.Marker({ map, position: { lat: store.lat, lng: store.lng }, title: store.name });
        marker.addListener("click", () => selectStore(store.id, geocoded, marker));
        markersRef.current.set(store.id, marker);
      });
      setStores(geocoded);
      setStatus("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
    });
    return () => { active = false; };
  }, [locations]);

  function selectStore(id: string, storeList: GeoStore[], markerOverride?: google.maps.Marker) {
    const store = storeList.find((item) => item.id === id);
    const map = mapRef.current; const infoWindow = infoWindowRef.current; const marker = markerOverride ?? markersRef.current.get(id);
    if (!store || !map || !infoWindow || !marker) return;
    setSelectedId(id);
    map.panTo({ lat: store.lat, lng: store.lng });
    infoWindow.setContent(`<div style="font-family:inherit;min-width:220px"><strong style="display:block;margin-bottom:4px">${store.name}</strong><span style="display:block;color:#666;font-size:12px;margin-bottom:6px">${store.description}</span><span style="display:block;color:#888;font-size:11px">${store.address}</span></div>`);
    infoWindow.open({ map, anchor: marker });
  }

  const sortedStores = useMemo(() => [...stores].sort((a, b) => a.name.localeCompare(b.name, "ko")), [stores]);
  const previewNecessities = necessities.slice(0, 4);

  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>MAP</p><h1>지도에서 찾기</h1><span>편의점·마트에서 생필품을 바로 픽업할 수 있는 우리 동네 매장을 지도에서 확인하세요.</span></div>
      </section>
      <section className="section-wrap map-page">
        <div className="map-layout">
          <div className="map-canvas-wrap">
            {status === "error" && (
              <div className="empty-state map-canvas-fallback">
                <MapPin size={30} />
                <h2>지도를 불러올 수 없습니다.</h2>
                <p>{errorMessage}</p>
              </div>
            )}
            {status === "loading" && <div className="empty-state map-canvas-fallback">지도를 불러오는 중입니다.</div>}
            <div ref={mapNodeRef} className="map-canvas" style={{ display: status === "ready" ? "block" : "none" }} />
          </div>
          <aside className="map-store-list" aria-label="주변 픽업 매장 목록">
            {sortedStores.map((store) => (
              <button
                type="button"
                key={store.id}
                className={`map-store-card${selectedId === store.id ? " active" : ""}`}
                onClick={() => selectStore(store.id, sortedStores)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, borderRadius: 9, background: "var(--muted)" }}>
                  <Store size={26} />
                </div>
                <div>
                  <strong>{store.name}</strong>
                  <span className="map-store-deal">{store.description}</span>
                  <span className="map-store-address"><Navigation size={12} /> {store.address}</span>
                </div>
                <span
                  className="map-store-link"
                  onClick={(event) => { event.stopPropagation(); navigate(`/products?category=${encodeURIComponent(NECESSITIES_CATEGORY)}`); }}
                >
                  생필품 보러가기
                </span>
              </button>
            ))}
          </aside>
        </div>

        {previewNecessities.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock3 size={18} /> 이 매장들에서 픽업할 수 있는 생필품
              </h2>
              <span
                onClick={() => navigate(`/products?category=${encodeURIComponent(NECESSITIES_CATEGORY)}`)}
                style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
              >
                전체보기
              </span>
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
