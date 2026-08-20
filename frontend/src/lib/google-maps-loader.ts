/**
 * Google Maps JavaScript API 스크립트를 한 번만 주입하고 로드 완료를 기다리는 유틸리티입니다.
 * MapPage가 지도를 그리기 전에 이 함수로 `google.maps` 네임스페이스 준비를 기다립니다.
 * 키 미설정 시 네트워크 요청 없이 명시적으로 실패해 화면이 조용히 깨지지 않게 합니다.
 */
import { publicKeys } from "@/config/public-keys";

export const isGoogleMapsConfigured = Boolean(publicKeys.googleMapsApiKey);

declare global { interface Window { __timedealGoogleMapsCallback?: () => void } }

let loadPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!isGoogleMapsConfigured) return Promise.reject(new Error("프론트 Google Maps API 키(VITE_GOOGLE_MAPS_API_KEY)가 설정되지 않았습니다."));
  if (typeof window === "undefined") return Promise.reject(new Error("브라우저 환경에서만 지도를 불러올 수 있습니다."));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.__timedealGoogleMapsCallback = () => window.google?.maps?.Map ? resolve(window.google.maps) : reject(new Error("Google Maps 초기화에 실패했습니다."));
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(publicKeys.googleMapsApiKey)}&callback=__timedealGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => { loadPromise = null; reject(new Error("Google Maps 스크립트를 불러오지 못했습니다. API 키와 네트워크 연결을 확인하세요.")); };
    document.head.appendChild(script);
  });
  return loadPromise;
}
