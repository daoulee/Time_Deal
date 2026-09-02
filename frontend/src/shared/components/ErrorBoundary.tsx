/**
 * React 렌더링 중 발생한 예외를 흰 화면 대신 안내 화면으로 대체하고 백엔드에 보고합니다.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportClientError } from "@/lib/api";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportClientError(error.message, error.stack ?? info.componentStack ?? undefined, window.location.pathname);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 15, color: "#334155" }}>일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            style={{ height: 40, padding: "0 18px", background: "#ff5722", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            홈으로 돌아가기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
