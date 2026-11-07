import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const state = vi.hoisted(() => ({ key: "test-key", calls: vi.fn(), quota: vi.fn() }));
vi.mock("../src/config.js", () => ({
  config: { get anthropicApiKey() { return state.key; }, aiModel: "test-model" },
  isSupabaseConfigured: () => true,
}));
vi.mock("../src/supabase.js", () => ({ getAdminSupabase: () => ({ rpc: state.quota }) }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { parse: state.calls }; } }));
import { createDinnerSuggestRouter } from "../src/modules/AI/DinnerSuggestRoutes.js";

const deal = (id: string, price: number, stock = 1) => ({ id, title: `상품 ${id}`, store_name: "테스트", store_category: "음식", discounted_price: price, remaining_stock: stock, expires_at: "2099-01-01T00:00:00Z" });
const makeApp = (loader: () => Promise<ReturnType<typeof deal>[]>, authenticated = true) => {
  const app = new Hono();
  if (authenticated) app.use("*", async (context, next) => {
    context.set("currentUser", { id: "guest-1", email: "", name: "", role: "user", emailVerified: true });
    await next();
  });
  return app.route("/ai", createDinnerSuggestRouter(loader));
};
const call = (app: Hono, data: unknown) => app.request("/ai/dinner-suggest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });

describe("dinner suggestion route", () => {
  beforeEach(() => { state.key = "test-key"; state.calls.mockReset(); state.quota.mockReset(); state.quota.mockResolvedValue({ data: true, error: null }); });
  it("requires a verified session and rejects unsupported explicit budgets", async () => {
    expect((await call(makeApp(async () => [deal("a", 1000)], false), { query: "저녁" })).status).toBe(401);
    expect((await call(makeApp(async () => [deal("a", 1000)]), { query: "5천 원 이하" })).status).toBe(400);
    expect(state.calls).not.toHaveBeenCalled();
  });
  it("returns empty candidates without calling AI", async () => {
    state.key = "";
    const result = await call(makeApp(async () => [deal("sold", 1000, 0)]), { query: "만원 이하" });
    expect(result.status).toBe(200);
    expect((await result.json()).data.picks).toEqual([]);
    expect(state.calls).not.toHaveBeenCalled();
  });
  it("returns 503 when the AI key is absent and candidates exist", async () => {
    state.key = "";
    expect((await call(makeApp(async () => [deal("a", 1000)]), { query: "저녁" })).status).toBe(503);
    expect(state.calls).not.toHaveBeenCalled();
  });
  it("rechecks offered IDs, current stock and budget without sending coordinates to the model", async () => {
    state.calls.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { picks: [
      { dealId: "invented", reason: "price" }, { dealId: "sold", reason: "availability" },
      { dealId: "good", reason: "price" }, { dealId: "good", reason: "category" },
      { dealId: "expensive", reason: "price" },
    ] } });
    let loads = 0;
    const loader = async () => { loads++; return [deal("good", 5000), deal("sold", 3000, loads === 1 ? 1 : 0), deal("expensive", 12000)]; };
    const result = await call(makeApp(loader), { query: "혼자 먹는 저녁 만 원 이하", lat: 37.123456, lng: 127.123456 });
    expect(result.status).toBe(200);
    const data = (await result.json()).data;
    expect(data.locationStatus).toBe("unverified");
    expect(data.picks.map((pick: { deal: { id: string } }) => pick.deal.id)).toEqual(["good"]);
    expect(data.picks[0].reason).toContain("5,000원");
    const prompt = JSON.stringify(state.calls.mock.calls[0][0]);
    expect(prompt).not.toContain("37.123456");
    expect(prompt).not.toContain("127.123456");
    expect(loads).toBe(2);
  });
  it("does not invent fallback recommendations when AI refuses or quota fails", async () => {
    state.quota.mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    expect((await call(makeApp(async () => [deal("a", 1000)]), { query: "저녁" })).status).toBe(503);
    expect(state.calls).not.toHaveBeenCalled();
    state.calls.mockResolvedValueOnce({ stop_reason: "refusal", parsed_output: null });
    expect((await call(makeApp(async () => [deal("a", 1000)]), { query: "저녁" })).status).toBe(502);
  });
});
// [Codex | 2026-11-06] 추천 인증·조건·재조회·환각·실패 경로 검증
