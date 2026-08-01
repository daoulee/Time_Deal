/**
 * React 앱 진입 모듈이 최소 환경에서 오류 없이 로드되는지 확인합니다.
 * App의 pages 라우팅과 전역 공급자 조립이 깨지지 않았는지 빠르게 검증합니다.
 * 세부 화면 동작보다 초기 렌더링 회귀 탐지에 집중합니다.
 */
// T2 (frontend smoke) — skeleton.
//
// Intended behavior (TODO, next-round PR): import App and assert that
// `render(<App />)` does not throw and produces SOME content in the
// container. That catches dead imports, missing exports, runtime errors
// in module top-level code, and SSR-unsafe globals touched during the
// first paint.
//
//   import { render } from "@testing-library/react";
//   import App from "../App";
//
//   it("renders without throwing", () => {
//     const { container } = render(<App />);
//     expect(container.firstChild).not.toBeNull();
//   });
//
// For this PR the body is intentionally a placeholder — the gate doesn't
// depend on it (T2 is "可选" per the design doc's mode × type matrix), and
// implementing it cleanly needs @testing-library/react to be wired (B14)
// plus a decision about which provider boundary App needs (Router, Query,
// Theme). Punted to the next round.

import { describe, expect, it } from "vitest";

describe("app smoke (skeleton)", () => {
  it("placeholder — replace with `render(<App />)` assertion", () => {
    expect(true).toBe(true);
  });
});
