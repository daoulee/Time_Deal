/**
 * 처리되지 않은 브라우저 에러(전역 에러·Promise rejection)를 잡아 백엔드로 보고합니다.
 * 관리자 콘솔의 에러 로그 화면에서 실제 사용자가 겪은 프론트 에러를 확인할 수 있게 합니다.
 */
import { reportClientError } from "@/lib/api";

let installed = false;

export function installGlobalErrorReporting() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    void reportClientError(event.message || "Unknown error", event.error?.stack, window.location.pathname);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as unknown;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    void reportClientError(message, stack, window.location.pathname);
  });
}
