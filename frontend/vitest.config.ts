/**
 * 프론트 단위·라우팅 테스트를 실행하는 Vitest 환경과 파일 범위를 설정합니다.
 * React 컴포넌트 테스트가 브라우저 유사 환경에서 Vite 별칭을 그대로 사용하도록 합니다.
 * node_modules와 빌드·임시 폴더는 테스트 검색 대상에서 제외해야 합니다.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

// Client-side test config. happy-dom (already in devDeps) is preferred over
// jsdom: smaller install footprint, ~3x faster startup, and the smoke / unit
// tests we run here don't depend on jsdom-only behavior.
//
// Includes the existing `lib/api-base.test.ts` plus any `src/__tests__/**`
// the agent (or scaffold) adds later. T2 (frontend smoke) lives under
// `src/__tests__/app.smoke.test.tsx`.
export default defineConfig({
  define: {
    __ROUTE_MESSAGING_ENABLED__: "true"
  },
  test: {
    name: "client",
    environment: "happy-dom",
    include: ["lib/**/*.test.ts", "src/**/*.test.{ts,tsx}", "src/__tests__/**/*.test.{ts,tsx}"],
    globals: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-router-dom": path.resolve(__dirname, "./src/lib/react-router-dom-proxy.tsx"),
      "react-router-dom-original": "react-router-dom"
    }
  }
});
