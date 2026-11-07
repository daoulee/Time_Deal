import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const state = vi.hoisted(() => ({ key: "test-key", calls: vi.fn(), quota: vi.fn() }));
vi.mock("../src/config.js", () => ({ config: {
  get anthropicApiKey() { return state.key; }, aiModel: "test-model", maxImageBytes: 1024,
} }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class {
  messages = { parse: state.calls };
} }));
vi.mock("../src/supabase.js", () => ({ getAdminSupabase: () => ({ rpc: state.quota }) }));
import { productDraftRouter } from "../src/modules/AI/ProductDraftRoutes.js";

const makeApp = (role: "user" | "seller" = "seller", id = "test-user") => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("currentUser", { id, email: "", name: "", role, emailVerified: true });
    await next();
  });
  app.route("/ai", productDraftRouter);
  return app;
};
const image = { mediaType: "image/png", imageBase64: Buffer.from([137,80,78,71,13,10,26,10]).toString("base64") };
const call = (app: Hono, data: unknown) => app.request("/ai/product-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });

describe("product draft API", () => {
  beforeEach(() => { state.key = "test-key"; state.calls.mockReset(); state.quota.mockReset(); state.quota.mockResolvedValue({ data: true, error: null }); });
  it("requires seller permission", async () => { expect((await call(makeApp("user"), image)).status).toBe(403); });
  it("returns 503 when the key is missing", async () => { state.key = ""; expect((await call(makeApp(), image)).status).toBe(503); expect(state.calls).not.toHaveBeenCalled(); });
  it("rejects invalid and oversized images before calling AI", async () => {
    expect((await call(makeApp(), { ...image, imageBase64: "not-base64" })).status).toBe(400);
    expect((await call(makeApp(), { ...image, imageBase64: Buffer.alloc(1025).toString("base64") })).status).toBe(400);
    expect(state.calls).not.toHaveBeenCalled();
  });
  it("returns a validated draft", async () => {
    state.calls.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { isProduct: true, name: "빵", category: "베이커리", description: "빵", estimatedOriginalPrice: 3000, suggestedDiscountPercent: 30, confidence: "low" } });
    const response = await call(makeApp(), image);
    expect(response.status).toBe(200);
    expect((await response.json()).data.draft.name).toBe("빵");
  });
  it("does not return refused or missing results", async () => {
    state.calls.mockResolvedValue({ stop_reason: "refusal", parsed_output: null });
    expect((await call(makeApp(), image)).status).toBe(502);
    state.calls.mockResolvedValue({ stop_reason: "end_turn", parsed_output: null });
    expect((await call(makeApp(), image)).status).toBe(502);
  });
  it("limits a seller to 30 attempts per day", async () => {
    state.calls.mockResolvedValue({ stop_reason: "refusal", parsed_output: null });
    let count = 0;
    state.quota.mockImplementation(async () => ({ data: ++count <= 30, error: null }));
    const app = makeApp("seller", "quota-user");
    for (let i = 0; i < 30; i++) expect((await call(app, image)).status).toBe(502);
    expect((await call(app, image)).status).toBe(429);
    expect(state.calls).toHaveBeenCalledTimes(30);
  });
  it("fails closed when shared usage limit is exhausted or unavailable", async () => {
    state.quota.mockResolvedValueOnce({ data: false, error: null });
    expect((await call(makeApp(), image)).status).toBe(429);
    state.quota.mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    expect((await call(makeApp(), image)).status).toBe(503);
    expect(state.calls).not.toHaveBeenCalled();
  });
});
// [Codex | 2026-11-06] 상품 초안 API 권한·실패·입력 검증 테스트
