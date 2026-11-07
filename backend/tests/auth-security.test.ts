import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const state = vi.hoisted(() => ({ getUser: vi.fn(), fetch: vi.fn(), upsert: vi.fn() }));
vi.mock("../src/supabase.js", () => ({
  getAdminSupabase: () => ({
    auth: { getUser: state.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: state.fetch }) }), upsert: state.upsert }),
  }),
}));
import { optionalAuth, requireRole } from "../src/middleware/auth.js";

const app = new Hono();
app.use("*", optionalAuth);
app.get("/seller", requireRole("seller", "admin"), (c) => c.json({ role: c.var.currentUser?.role }));
const request = () => app.request("/seller", { headers: { Authorization: "Bearer token" } });

describe("server authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.getUser.mockResolvedValue({ data: { user: { id: "user-id", user_metadata: {} } }, error: null });
  });
  it("프로필 조회 오류 시 기존 계정을 덮어쓰지 않고 차단한다", async () => {
    state.fetch.mockResolvedValue({ data: null, error: { message: "temporary error" } });
    expect((await request()).status).toBe(503);
    expect(state.upsert).not.toHaveBeenCalled();
  });
  it("정지된 판매자의 기존 토큰을 거부한다", async () => {
    state.fetch.mockResolvedValue({ data: { name: "seller", role: "seller", is_suspended: true }, error: null });
    expect((await request()).status).toBe(403);
  });
  it("새 계정 생성 경쟁 시 기존 판매자 역할을 덮어쓰지 않고 재조회한다", async () => {
    state.fetch.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { name: "seller", role: "seller", is_suspended: false }, error: null });
    state.upsert.mockResolvedValue({ error: null });
    const response = await request();
    expect(response.status).toBe(200);
    expect((await response.json()).role).toBe("seller");
    expect(state.upsert).toHaveBeenCalledWith(expect.objectContaining({ role: "user" }), { onConflict: "id", ignoreDuplicates: true });
  });
  it("역할이나 정지 상태가 불명확하면 권한을 주지 않는다", async () => {
    state.fetch.mockResolvedValue({ data: { name: "seller", role: "seller", is_suspended: null }, error: null });
    expect((await request()).status).toBe(403);
    state.fetch.mockResolvedValue({ data: { name: "seller", role: "unknown", is_suspended: false }, error: null });
    expect((await request()).status).toBe(503);
  });
});
// [Codex | 2026-11-07] 수정범위: 인증 미들웨어 실패·정지·동시 생성 테스트
