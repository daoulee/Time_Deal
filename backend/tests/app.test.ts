/**
 * 비밀값이 없는 운영 기본 상태에서 health/readiness·샘플 차단·보안 헤더·보호 API를 검증합니다.
 * 실제 Supabase나 외부 네트워크를 호출하지 않습니다.
 */
import { describe, expect, it } from "vitest";
import app from "../src/app.js";
describe("public API without secrets", () => {
  it("exposes liveness but reports unconfigured data mode", async () => { const response = await app.request("/health"); expect(response.status).toBe(200); expect((await response.json()).data.dataMode).toBe("unconfigured"); expect(response.headers.get("x-content-type-options")).toBe("nosniff"); });
  it("fails readiness without database configuration", async () => { expect((await app.request("/ready")).status).toBe(503); });
  it("does not hide production configuration errors with sample catalog", async () => { const response = await app.request("/api/catalog"); expect(response.status).toBe(503); expect((await response.json()).error.code).toBe("SUPABASE_UNCONFIGURED"); });
  it("protects mutations before reading request bodies", async () => { expect((await app.request("/api/reviews", { method: "POST", body: "{}" })).status).toBe(401); });
  it("does not expose the unfinished Naver callback", async () => { expect((await app.request("/api/auth/naver/callback")).status).toBe(404); });
});
