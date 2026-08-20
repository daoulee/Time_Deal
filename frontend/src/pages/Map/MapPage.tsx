/**
 * 홈 화면의 "지도에서 찾기" 버튼이 연결되는 지도 화면입니다.
 * Google Maps JavaScript API로 성수동 인근 마감 특가 매장을 지도 마커와 목록으로 보여줍니다.
 * VITE_GOOGLE_MAPS_API_KEY가 없으면 조용히 깨지지 않고 설정 필요 안내를 보여줍니다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, MapPin, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps-loader";

type MapStore = { id: string; name: string; deal: string; price: number; discountRate: number; deadline: string; address: string; lat: number; lng: number; image: string };

const SEONGSU_CENTER = { lat: 37.5445, lng: 127.0562 };
const STORES: MapStore[] = [
  { id: "1", name: "성수 수제 함박스테이크", deal: "함박스테이크 & 구운 채소", price: 12900, discountRate: 28, deadline: "오늘 21:00 마감", address: "서울 성동구 성수이로 20", lat: 37.5443, lng: 127.0557, image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80" },
  { id: "2", name: "산지직송 청과", deal: "논산 딸기 2팩", price: 8500, discountRate: 29, deadline: "오늘 21:00 마감", address: "서울 성동구 성수이로 12길 8", lat: 37.5461, lng: 127.0549, image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80" },
  { id: "3", name: "성수 생활마트", deal: "롤화장지 32롤", price: 16900, discountRate: 32, deadline: "오늘 22:00 마감", address: "서울 성동구 아차산로 17길 22", lat: 37.5428, lng: 127.0578, image: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80" },
  { id: "4", name: "동네 정육·계란 상회", deal: "특란 30구", price: 9900, discountRate: 34, deadline: "오늘 20:00 마감", address: "서울 성동구 성수일로4길 13", lat: 37.5452, lng: 127.0591, image: "https://images.unsplash.com/photo-1582722872446-47e2ef309252?auto=format&fit=crop&w=600&q=80" },
  { id: "5", name: "성수 명품 베이커리", deal: "버터 소금빵 4개 세트", price: 7900, discountRate: 34, deadline: "오늘 21:30 마감", address: "서울 성동구 연무장길 9", lat: 37.5436, lng: 127.0540, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80" },
  { id: "6", name: "샐러드 공방", deal: "닭가슴살 샐러드 팩", price: 4900, discountRate: 35, deadline: "오늘 20:30 마감", address: "서울 성동구 왕십리로 96", lat: 37.5417, lng: 127.0565, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80" },
];

const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;

export default function MapPage() {
  const navigate = useNavigate();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isGoogleMapsConfigured) { setStatus("error"); setErrorMessage("프론트 Google Maps API 키(VITE_GOOGLE_MAPS_API_KEY)가 설정되지 않았습니다."); return; }
    let active = true;
    void loadGoogleMaps().then((maps) => {
      if (!active || !mapNodeRef.current) return;
      const map = new maps.Map(mapNodeRef.current, { center: SEONGSU_CENTER, zoom: 15, disableDefaultUI: false, streetViewControl: false, fullscreenControl: false });
      mapRef.current = map;
      const infoWindow = new maps.InfoWindow();
      infoWindowRef.current = infoWindow;
      STORES.forEach((store) => {
        const marker = new maps.Marker({ map, position: { lat: store.lat, lng: store.lng }, title: store.name });
        marker.addListener("click", () => selectStore(store.id, marker));
        markersRef.current.set(store.id, marker);
      });
      setStatus("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
    });
    return () => { active = false; };
  }, []);

  function selectStore(id: string, markerOverride?: google.maps.Marker) {
    const store = STORES.find((item) => item.id === id);
    const map = mapRef.current; const infoWindow = infoWindowRef.current; const marker = markerOverride ?? markersRef.current.get(id);
    if (!store || !map || !infoWindow || !marker) return;
    setSelectedId(id);
    map.panTo({ lat: store.lat, lng: store.lng });
    infoWindow.setContent(`<div style="font-family:inherit;min-width:220px"><img src="${store.image}" alt="${store.name}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;display:block" /><strong style="display:block;margin-bottom:4px">${store.name}</strong><span style="display:block;color:#666;font-size:12px;margin-bottom:6px">${store.deal}</span><b style="color:#ff5722">${store.discountRate}% OFF</b> <span>${formatPrice(store.price)}</span></div>`);
    infoWindow.open({ map, anchor: marker });
  }

  const sortedStores = useMemo(() => [...STORES].sort((a, b) => a.name.localeCompare(b.name, "ko")), []);

  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>MAP</p><h1>지도에서 찾기</h1><span>성수동 인근 마감 특가 매장을 지도에서 바로 확인하세요.</span></div>
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
          <aside className="map-store-list" aria-label="주변 매장 목록">
            {sortedStores.map((store) => (
              <button
                type="button"
                key={store.id}
                className={`map-store-card${selectedId === store.id ? " active" : ""}`}
                onClick={() => selectStore(store.id)}
              >
                <img src={store.image} alt={store.name} className="map-store-thumb" />
                <div>
                  <strong>{store.name}</strong>
                  <span className="map-store-deal">{store.deal}</span>
                  <span className="map-store-address"><Navigation size={12} /> {store.address}</span>
                </div>
                <div className="map-store-meta">
                  <b>{store.discountRate}% OFF</b>
                  <span>{formatPrice(store.price)}</span>
                  <small><Clock3 size={12} /> {store.deadline}</small>
                </div>
                <span className="map-store-link" onClick={(event) => { event.stopPropagation(); navigate(`/products/${store.id}`); }}>상세보기</span>
              </button>
            ))}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
