/**
 * Render 백엔드 기본 주소와 API 경로를 안전하게 결합합니다.
 * apiFetch와 인증 어댑터가 VITE_API_BASE_URL 하나를 공통으로 사용합니다.
 * 환경변수가 없을 때만 로컬 10000 포트를 기본값으로 사용합니다.
 */
type ViteRuntimeEnv = { VITE_API_BASE_URL?: string };

// Render 백엔드 주소는 frontend/.env의 VITE_API_BASE_URL 하나로만 주입합니다.
// 값이 없을 때는 로컬 독립 개발 기본값을 사용하며, 운영 주소를 코드에 넣지 않습니다.
const runtimeEnv = import.meta.env as ViteRuntimeEnv;
const rawBaseUrl = runtimeEnv.VITE_API_BASE_URL?.trim() || "http://localhost:10000";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = normalizedPath === "/api" || normalizedPath.startsWith("/api/") ? normalizedPath : `/api${normalizedPath}`;
  return `${API_BASE_URL}${apiPath}`;
}

export function authUrl(path = "") {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return apiUrl(`/auth${normalizedPath}`);
}
