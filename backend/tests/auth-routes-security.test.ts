import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const state = vi.hoisted(() => ({ signUp: vi.fn(), signIn: vi.fn(), upsert: vi.fn(), profile: vi.fn() }));
vi.mock("../src/config.js", () => ({ config: { guestMode: false }, passwordResetRedirect: () => "https://example.test" }));
vi.mock("../src/supabase.js", () => ({
  getAnonSupabase: () => ({ auth: { signUp: state.signUp, signInWithPassword: state.signIn } }),
  getAdminSupabase: () => ({ from: () => ({ upsert: state.upsert, select: () => ({ eq: () => ({ maybeSingle: state.profile }) }) }) }),
}));
import { authRouter } from "../src/modules/Auth/AuthRoutes.js";
const app = new Hono().route("/auth", authRouter);
const jsonRequest = (path: string, body: unknown) => app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("account route protections", () => {
  beforeEach(() => vi.resetAllMocks());
  it("회원가입 시 기존 역할을 덮어쓰지 않는다", async () => {
    state.signUp.mockResolvedValue({ data: { user: { id: "id" }, session: { access_token: "token" } }, error: null });
    state.upsert.mockResolvedValue({ error: null });
    expect((await jsonRequest("/auth/sign-up", { email: "a@example.com", password: "password123", name: "사장님" })).status).toBe(201);
    expect(state.upsert).toHaveBeenCalledWith(expect.objectContaining({ role: "user" }), { onConflict: "id", ignoreDuplicates: true });
  });
  it("로그인 시 정지 상태 조회 실패는 토큰을 반환하지 않는다", async () => {
    state.signIn.mockResolvedValue({ data: { user: { id: "id" }, session: { access_token: "secret" } }, error: null });
    state.profile.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    const response = await jsonRequest("/auth/sign-in", { email: "a@example.com", password: "password123" });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
  it("로그인 시 프로필이 없거나 정지된 계정에는 토큰을 반환하지 않는다", async () => {
    state.signIn.mockResolvedValue({ data: { user: { id: "id" }, session: { access_token: "secret" } }, error: null });
    state.profile.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { is_suspended: true }, error: null });
    for (const finalStatus of [503, 403]) {
      const response = await jsonRequest("/auth/sign-in", { email: "a@example.com", password: "password123" });
      expect(response.status).toBe(finalStatus);
      expect(await response.text()).not.toContain("secret");
    }
  });
});
// [Codex | 2026-11-07] 수정범위: 회원가입 역할 보호 및 로그인 조회 실패 테스트
