/**
 * 일반 로그인 보호 가드의 세션 로딩과 리다이렉트 동작을 검증합니다.
 * MyPage 같은 인증 화면이 게스트에게 노출되지 않는지 확인합니다.
 * 실제 Supabase 대신 제어된 세션 상태를 사용합니다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth, RequireVerifiedEmail } from "./route-guards";

const useSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => useSession(),
  },
}));

function renderGuarded(element: React.ReactNode, initialPath = "/private") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/private" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe("auth route guards", () => {
  beforeEach(() => {
    useSession.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a loading state while the session is pending", () => {
    useSession.mockReturnValue({ data: null, isPending: true });

    const { container } = renderGuarded(
      <RequireAuth>
        <div>Private Content</div>
      </RequireAuth>
    );

    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText("Private Content")).toBeNull();
  });

  it("redirects guests to the auth route", () => {
    useSession.mockReturnValue({ data: null, isPending: false });

    renderGuarded(
      <RequireAuth>
        <div>Private Content</div>
      </RequireAuth>
    );

    expect(screen.getByText("Auth Page")).not.toBeNull();
    expect(screen.queryByText("Private Content")).toBeNull();
  });

  it("renders children for authenticated users", () => {
    useSession.mockReturnValue({
      data: { user: { id: "user_1", email: "user@example.com", emailVerified: false } },
      isPending: false,
    });

    renderGuarded(
      <RequireAuth>
        <div>Private Content</div>
      </RequireAuth>
    );

    expect(screen.getByText("Private Content")).not.toBeNull();
  });

  it("requires verified email when requested", () => {
    useSession.mockReturnValue({
      data: { user: { id: "user_1", email: "user@example.com", emailVerified: false } },
      isPending: false,
    });

    renderGuarded(
      <RequireVerifiedEmail>
        <div>Verified Content</div>
      </RequireVerifiedEmail>
    );

    expect(screen.getByText("Auth Page")).not.toBeNull();
    expect(screen.queryByText("Verified Content")).toBeNull();
  });

  it("renders verified-only content for verified users", () => {
    useSession.mockReturnValue({
      data: { user: { id: "user_1", email: "user@example.com", emailVerified: true } },
      isPending: false,
    });

    renderGuarded(
      <RequireVerifiedEmail>
        <div>Verified Content</div>
      </RequireVerifiedEmail>
    );

    expect(screen.getByText("Verified Content")).not.toBeNull();
  });
});
