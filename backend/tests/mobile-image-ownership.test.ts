import { describe, expect, it } from "vitest";
import { isOwnedImagePath } from "../src/modules/Mobile/MobileRoutes.js";

describe("mobile product image ownership", () => {
  it("allows only the seller's exact path prefix", () => {
    expect(isOwnedImagePath("seller-1/random-product.jpg", "seller-1")).toBe(true);
    expect(isOwnedImagePath("seller-10/random-product.jpg", "seller-1")).toBe(false);
    expect(isOwnedImagePath("seller-2/random-product.jpg", "seller-1")).toBe(false);
    expect(isOwnedImagePath("seller-1/../seller-2/product.jpg", "seller-1")).toBe(false);
  });
});
// [Codex | 2026-11-06] 판매자 이미지 경로 검증 회귀 테스트
