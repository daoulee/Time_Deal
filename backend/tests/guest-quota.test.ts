import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const state = vi.hoisted(() => ({ enabled: true, quota: vi.fn(), createUser: vi.fn(), deleteUser: vi.fn(), profile: vi.fn(), signIn: vi.fn() }));
vi.mock("../src/config.js", () => ({ config: { get guestMode() { return state.enabled; } }, passwordResetRedirect: () => "https://example.test" }));
vi.mock("../src/supabase.js", () => ({
  getAdminSupabase: () => ({ rpc: state.quota, auth: { admin: { createUser: state.createUser, deleteUser: state.deleteUser } }, from: () => ({ upsert: state.profile }) }),
  getAnonSupabase: () => ({ auth: { signInWithPassword: state.signIn } }),
}));
import { authRouter } from "../src/modules/Auth/AuthRoutes.js";

const app = new Hono().route("/auth", authRouter);
describe("guest account quota", () => {
  beforeEach(() => { state.enabled = true; state.quota.mockReset(); state.createUser.mockReset(); state.deleteUser.mockReset(); state.profile.mockReset(); state.signIn.mockReset(); });
  it("does not create guest accounts when guest mode is disabled", async () => {
    state.enabled = false;
    expect((await app.request("/auth/guest", { method: "POST" })).status).toBe(403);
    expect(state.createUser).not.toHaveBeenCalled();
  });
  it("does not create accounts when the daily quota is exhausted", async () => {
    state.quota.mockResolvedValue({ data: false, error: null });
    expect((await app.request("/auth/guest", { method: "POST" })).status).toBe(429);
    expect(state.createUser).not.toHaveBeenCalled();
  });
  it("fails closed when quota storage is unavailable", async () => {
    state.quota.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect((await app.request("/auth/guest", { method: "POST" })).status).toBe(503);
    expect(state.createUser).not.toHaveBeenCalled();
  });
  it("removes the newly created guest if its seller profile cannot be saved", async () => {
    state.quota.mockResolvedValue({ data: true, error: null });
    state.createUser.mockResolvedValue({ data: { user: { id: "new-guest" } }, error: null });
    state.profile.mockResolvedValue({ error: { message: "profile unavailable" } });
    state.deleteUser.mockResolvedValue({ error: null });
    expect((await app.request("/auth/guest", { method: "POST" })).status).toBe(502);
    expect(state.deleteUser).toHaveBeenCalledWith("new-guest");
    expect(state.signIn).not.toHaveBeenCalled();
  });
});
// [Codex | 2026-11-06] 게스트 생성 한도·저장소 실패 시 계정 미생성 검증
