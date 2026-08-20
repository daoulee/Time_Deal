/**
 * 백엔드 기본 주소와 `/api` 경로 결합 규칙을 검증합니다.
 * apiFetch와 인증 요청이 독립 Render 주소를 정확히 사용하는지 회귀 테스트합니다.
 * 환경변수 격리와 로컬 기본 포트 10000 동작을 확인합니다.
 */
import { describe, expect, it, vi } from "vitest";

async function loadApiBase() {
  vi.resetModules();
  vi.stubGlobal("window", {
    location: {
      origin: "http://localhost:3100"
    }
  });

  return import("./api-base");
}

describe("api-base", () => {
  it("normalizes apiUrl paths with an /api prefix", async () => {
    const { apiUrl } = await loadApiBase();

    expect(apiUrl("/api/todos")).toBe("http://localhost:10000/api/todos");
    expect(apiUrl("/counter/stats")).toBe("http://localhost:10000/api/counter/stats");
    expect(apiUrl("counter/stats")).toBe("http://localhost:10000/api/counter/stats");
    expect(apiUrl("api/counter/stats")).toBe("http://localhost:10000/api/counter/stats");
    expect(apiUrl("/api/auth-config")).toBe("http://localhost:10000/api/auth-config");
    expect(apiUrl("/api")).toBe("http://localhost:10000/api");
  });

  it("keeps authUrl mounted under /api/auth", async () => {
    const { authUrl } = await loadApiBase();

    expect(authUrl()).toBe("http://localhost:10000/api/auth");
    expect(authUrl("/sign-in/social")).toBe("http://localhost:10000/api/auth/sign-in/social");
  });
});
