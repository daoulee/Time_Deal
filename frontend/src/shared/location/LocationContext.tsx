/**
 * 사이트 전역에서 공유되는 "내 동네" 상태입니다. 헤더(StoreHeader)와 홈 화면(HomePage)에 각자 따로
 * 있던 GPS/동네 설정 로직을 하나로 합쳐서, 한 곳에서 설정하면 동네 딜·지도 등 다른 화면에도 그대로 반영됩니다.
 * localStorage에 저장해 새로고침 후에도 유지되고, 직접 선택했던 동네는 "자주 찾는 동네" 이력으로 남습니다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps-loader";

export type LatLng = { lat: number; lng: number };
export type RecentLocation = { label: string; neighborhood: string | null; coords: LatLng | null };

type LocationState = {
  currentLocation: string;
  neighborhood: string | null;
  coords: LatLng | null;
  recentLocations: RecentLocation[];
};

const STORAGE_KEY = "td_location_state";
const RECENTS_MAX = 6;
const DEFAULT_STATE: LocationState = { currentLocation: "성수동 2가", neighborhood: "성수동", coords: null, recentLocations: [] };

// "성수동2가", "휘경동", "자양동" 처럼 formatted_address 안에서 마지막 "-동" 토큰을 동네 이름으로 추정합니다.
function extractNeighborhood(address: string): string | null {
  const matches = address.match(/[가-힣]+동(?:\d+가)?/g);
  if (!matches || matches.length === 0) return null;
  return matches[matches.length - 1];
}

function loadState(): LocationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<LocationState>;
    return { ...DEFAULT_STATE, ...parsed, recentLocations: parsed.recentLocations ?? [] };
  } catch {
    return DEFAULT_STATE;
  }
}

type LocationContextValue = LocationState & {
  locating: boolean;
  error: string | null;
  clearError: () => void;
  locateByGps: () => Promise<string | null>;
  setManualLocation: (address: string) => string | null;
  selectRecent: (entry: RecentLocation) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>(loadState);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const applyLocation = useCallback((label: string, coords: LatLng | null) => {
    const neighborhood = extractNeighborhood(label);
    setState((prev) => {
      const entry: RecentLocation = { label, neighborhood, coords };
      const withoutDuplicate = prev.recentLocations.filter((item) => item.label !== label);
      return { currentLocation: label, neighborhood, coords, recentLocations: [entry, ...withoutDuplicate].slice(0, RECENTS_MAX) };
    });
  }, []);

  const locateByGps = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { setError("이 브라우저에서는 위치 조회를 지원하지 않습니다."); resolve(null); return; }
      setLocating(true); setError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords: LatLng = { lat: latitude, lng: longitude };
          const coordLabel = `위도 ${latitude.toFixed(5)}, 경도 ${longitude.toFixed(5)}`;
          const finish = (label: string) => { applyLocation(label, coords); setLocating(false); resolve(label); };
          if (!isGoogleMapsConfigured) { finish(coordLabel); return; }
          void loadGoogleMaps()
            .then((maps) => new maps.Geocoder().geocode({ location: coords }))
            .then((response) => finish(response.results[0]?.formatted_address ?? coordLabel))
            .catch(() => finish(coordLabel));
        },
        (geoError) => {
          setLocating(false);
          setError(geoError.code === geoError.PERMISSION_DENIED ? "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요." : "현재 위치를 확인하지 못했습니다.");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, [applyLocation]);

  const setManualLocation = useCallback((address: string): string | null => {
    const trimmed = address.trim();
    if (!trimmed) return null;
    applyLocation(trimmed, null);
    return trimmed;
  }, [applyLocation]);

  const selectRecent = useCallback((entry: RecentLocation) => {
    setState((prev) => ({ currentLocation: entry.label, neighborhood: entry.neighborhood, coords: entry.coords, recentLocations: prev.recentLocations }));
  }, []);

  const value = useMemo<LocationContextValue>(() => ({ ...state, locating, error, clearError: () => setError(null), locateByGps, setManualLocation, selectRecent }), [state, locating, error, locateByGps, setManualLocation, selectRecent]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationStore() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocationStore must be used within LocationProvider");
  return context;
}
