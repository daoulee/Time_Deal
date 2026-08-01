/**
 * 인증 어댑터의 토큰 저장·메모리 폴백·세션 동작을 검증합니다.
 * AuthPage와 라우트 가드가 소비하는 authClient 계약을 보호합니다.
 * 테스트 모드에서는 자동 원격 세션 요청을 실행하지 않습니다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const AUTH_TOKEN_KEY = "timedeal-access-token";

// A controlled localStorage so the test does not depend on the ambient
// implementation of the test environment (it lacks some Storage methods).
function createFakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

// Storage that throws on every access — models a private-mode or a partitioned
// cross-origin preview iframe where localStorage is blocked.
function createBlockedStorage() {
  const blocked = () => {
    throw new Error("storage blocked");
  };
  return { getItem: blocked, setItem: blocked, removeItem: blocked, clear: blocked };
}

// Fresh module each time so the in-memory token resets — also models a reload.
async function loadAuth() {
  vi.resetModules();
  return import("./auth");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("auth token store", () => {
  it("persists the token to localStorage when storage is writable", async () => {
    vi.stubGlobal("localStorage", createFakeStorage());
    const { setAuthToken, getAuthToken, clearAuthToken } = await loadAuth();

    setAuthToken("tok-1");
    expect(getAuthToken()).toBe("tok-1");
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("tok-1");

    clearAuthToken();
    expect(getAuthToken()).toBe("");
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("survives a reload by reading the token back from localStorage", async () => {
    vi.stubGlobal("localStorage", createFakeStorage());

    const first = await loadAuth();
    first.setAuthToken("tok-reload");

    // Fresh module = in-memory token reset (a page reload); same storage.
    const second = await loadAuth();
    expect(second.getAuthToken()).toBe("tok-reload");
  });

  it("keeps the session in memory when localStorage is blocked (iframe / private mode)", async () => {
    vi.stubGlobal("localStorage", createBlockedStorage());
    const { setAuthToken, getAuthToken } = await loadAuth();

    expect(() => setAuthToken("tok-mem")).not.toThrow();
    expect(getAuthToken()).toBe("tok-mem");
  });

  it("clearing never throws even when storage access is blocked", async () => {
    vi.stubGlobal("localStorage", createBlockedStorage());
    const { setAuthToken, clearAuthToken, getAuthToken } = await loadAuth();
    setAuthToken("tok-x");

    expect(() => clearAuthToken()).not.toThrow();
    expect(getAuthToken()).toBe("");
  });
});
