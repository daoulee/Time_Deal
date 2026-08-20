/**
 * 관리자 가드의 로딩·비로그인·권한 분기 동작을 검증합니다.
 * AdminPage가 허가되지 않은 사용자에게 렌더링되지 않는지 확인합니다.
 * 백엔드 admin 권한 검사를 대체하지 않는 UI 회귀 테스트입니다.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminGuard } from "./AdminGuard";

const useSession = vi.fn();
const apiFetch = vi.fn();

vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => useSession(),
  },
}));

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderAdminGuard(initialPath = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <div>Admin Dashboard</div>
            </AdminGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminGuard", () => {
  beforeEach(() => {
    useSession.mockReset();
    apiFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects guests before rendering admin content", () => {
    useSession.mockReturnValue({ data: null, isPending: false });

    renderAdminGuard();

    expect(screen.getByText("Auth Page")).not.toBeNull();
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("renders forbidden state for non-admin users", async () => {
    useSession.mockReturnValue({
      data: { user: { id: "user_1", email: "user@example.com", emailVerified: true } },
      isPending: false,
    });
    apiFetch.mockResolvedValue(jsonResponse({ ok: true, data: { profile: { role: "user" } } }));

    renderAdminGuard();

    expect(await screen.findByText("403 Forbidden")).not.toBeNull();
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith("/me/profile");
  });

  it("renders admin content for admin users", async () => {
    useSession.mockReturnValue({
      data: { user: { id: "admin_1", email: "admin@example.com", emailVerified: true } },
      isPending: false,
    });
    apiFetch.mockResolvedValue(jsonResponse({ ok: true, data: { profile: { role: "admin" } } }));

    renderAdminGuard();

    expect(await screen.findByText("Admin Dashboard")).not.toBeNull();
    await waitFor(() => expect(screen.queryByText("403 Forbidden")).toBeNull());
    expect(apiFetch).toHaveBeenCalledWith("/me/profile");
  });
});
