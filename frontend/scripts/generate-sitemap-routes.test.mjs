/**
 * 사이트맵 공개 경로 추출 스크립트의 포함·제외 규칙을 검증합니다.
 * 동적 상품 경로와 보호된 마이페이지·판매자·관리자 경로의 회귀를 막습니다.
 * 빌드 결과물이 아니라 소스 라우팅을 기준으로 테스트합니다.
 */
import assert from "node:assert/strict";
import { collectSitemapRoutesFromSource } from "./generate-sitemap-routes.mjs";

const source = `
  import { Routes, Route } from "react-router-dom";

  export function App() {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path={"pricing"} element={<Pricing />} />
        <Route path="/blog/:slug" element={<Post />} />
        <Route path="/api/todos" element={<Api />} />
        <Route path="/assets/app.js" element={<Asset />} />
        <Route path="/publish/websiteBadge.js" element={<Publish />} />
        <Route path="/.well-known/acme-challenge/x" element={<WellKnown />} />
        <Route path="/robots.txt" element={<Robots />} />
        <Route path="/sitemap.xml" element={<Sitemap />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
`;

assert.deepEqual(collectSitemapRoutesFromSource(source), ["/", "/about", "/pricing"]);

console.log("[sitemap-routes:test] ok");
