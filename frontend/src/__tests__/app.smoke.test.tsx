/**
 * 전체 App 공급자·라우터·홈 화면이 브라우저 유사 환경에서 실제 렌더되는지 검증합니다.
 * 네트워크 요청을 명시적으로 모킹해 운영 API 실패 상태도 화면 오류 없이 처리하는지 확인합니다.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App 스모크 렌더", () => {
  it("홈과 공통 탐색을 실제로 렌더하고 빈 운영 결과를 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: "UNAVAILABLE", message: "테스트 API 비활성" } }), { status: 503, headers: { "Content-Type": "application/json" } })));
    render(<App />);
    expect(screen.getByRole("link", { name: "타임딜 홈" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /우리 동네 타임딜/ })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("[모닝특가] 신선 유기농 아침 샐러드 & 그래놀라 세트")).toBeTruthy());
    expect(screen.getByText("커뮤니티")).toBeTruthy();
  });
});
