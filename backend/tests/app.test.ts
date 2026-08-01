/**
 * 비밀값이 없는 상태의 백엔드 공개 조회와 보호 API 경계를 검증합니다.
 * health, 상품 샘플 폴백, 참여 쓰기 인증 차단이 구조 개편 후에도 유지되는지 확인합니다.
 * 실제 Supabase나 외부 네트워크를 호출하지 않습니다.
 */
import{describe,expect,it}from"vitest";import app from"../src/app.js";
describe("public API without secrets",()=>{it("exposes Render health",async()=>{const r=await app.request("/health");expect(r.status).toBe(200);expect((await r.json()).data.dataMode).toBe("sample-public-readonly")});it("labels catalog fallback",async()=>{const r=await app.request("/api/catalog");const b=await r.json();expect(b.data.source).toBe("sample");expect(b.data.notice).toContain("운영 데이터가 아닙니다")});it("protects mutations",async()=>{expect((await app.request("/api/participations",{method:"POST",body:"{}"})).status).toBe(401)})});
