import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const state = vi.hoisted(() => ({ key: "test-key" }));
vi.mock("../src/config.js", () => ({
  config: { get geminiApiKey() { return state.key; }, aiModel: "test-model", maxImageBytes: 1024 },
  isSupabaseConfigured: () => true,
}));
import { productDraftRouter } from "../src/modules/AI/ProductDraftRoutes.js";
import { createDinnerSuggestRouter } from "../src/modules/AI/DinnerSuggestRoutes.js";

const gemini = (obj: unknown, finishReason = "STOP") => new Response(JSON.stringify({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const fetchMock = vi.fn();
const later = new Date(Date.now() + 3_600_000).toISOString();
const deals = [
  { id: "a", title: "크루아상", store_name: "빵집", store_category: "베이커리", discounted_price: 5000, remaining_stock: 2, expires_at: later },
  { id: "b", title: "초밥", store_name: "초밥집", store_category: "음식", discounted_price: 12000, remaining_stock: 1, expires_at: later },
];

const makeApp = (role: "user" | "seller", id: string) => {
  const app = new Hono();
  app.use("*", async (c, next) => { c.set("currentUser", { id, email: "", name: "", role, emailVerified: true }); await next(); });
  app.route("/m", productDraftRouter);
  app.route("/c", createDinnerSuggestRouter(async () => deals));
  return app;
};
const post = (app: Hono, path: string, data: unknown) => app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
const png = { mediaType: "image/png", imageBase64: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64") };

beforeEach(() => { state.key = "test-key"; fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("product draft API (Gemini)", () => {
  it("requires seller permission", async () => { expect((await post(makeApp("user", "u1"), "/m/product-draft", png)).status).toBe(403); });
  it("is off without a key", async () => { state.key = ""; expect((await post(makeApp("seller", "s1"), "/m/product-draft", png)).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled(); });
  it("rejects a non-image before calling AI", async () => {
    expect((await post(makeApp("seller", "s2"), "/m/product-draft", { ...png, imageBase64: Buffer.from("hello!!!").toString("base64") })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns a validated draft and sends the key only in a header", async () => {
    fetchMock.mockResolvedValue(gemini({ isProduct: true, name: "크루아상", category: "베이커리", description: "버터 크루아상", estimatedOriginalPrice: 3500, suggestedDiscountPercent: 30, confidence: "medium" }));
    const res = await post(makeApp("seller", "s3"), "/m/product-draft", png);
    expect(res.status).toBe(200);
    expect((await res.json()).data.draft.name).toBe("크루아상");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("test-key");
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
  });
  it("rejects out-of-range AI output", async () => {
    fetchMock.mockResolvedValue(gemini({ isProduct: true, name: "빵", category: "베이커리", description: "", estimatedOriginalPrice: 3000, suggestedDiscountPercent: 90, confidence: "low" }));
    expect((await post(makeApp("seller", "s4"), "/m/product-draft", png)).status).toBe(502);
  });
  it("limits one seller to 20 calls a day", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const app = makeApp("seller", "s5");
    for (let i = 0; i < 20; i++) expect((await post(app, "/m/product-draft", png)).status).toBe(502);
    expect((await post(app, "/m/product-draft", png)).status).toBe(429);
  });
});

describe("dinner suggest API (Gemini)", () => {
  it("keeps only real, in-budget picks", async () => {
    fetchMock.mockResolvedValue(gemini({ picks: [{ dealId: "invented", reason: "price" }, { dealId: "a", reason: "price" }, { dealId: "b", reason: "price" }] }));
    const res = await post(makeApp("user", "c1"), "/c/dinner-suggest", { query: "혼자 먹을 저녁 만 원 이하" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.picks.map((p: { deal: { id: string } }) => p.deal.id)).toEqual(["a"]);
  });
  it("answers without AI when nothing fits the budget", async () => {
    const res = await post(makeApp("user", "c2"), "/c/dinner-suggest", { query: "1000원 이하" });
    expect((await res.json()).data.picks).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("fails safely on a broken AI answer", async () => {
    fetchMock.mockResolvedValue(gemini({ picks: "nope" }));
    expect((await post(makeApp("user", "c3"), "/c/dinner-suggest", { query: "저녁 추천" })).status).toBe(502);
  });
});
// [Claude | 2026-11-18] Gemini 기반 AI API 권한·검증·한도 테스트

describe("Gemini model fallback", () => {
  it("moves to the next model when one is retired (404)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(gemini({ picks: [{ dealId: "a", reason: "availability" }] }));
    const res = await post(makeApp("user", "f1"), "/c/dinner-suggest", { query: "저녁" });
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[1][0])).not.toBe(String(fetchMock.mock.calls[0][0]));
  });
});
