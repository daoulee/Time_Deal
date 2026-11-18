import { describe, expect, it } from "vitest";
import { eligibleDinnerDeals, parseBudget, verifyDinnerChoices } from "../src/modules/AI/DinnerPolicy.js";

const now = Date.parse("2026-11-06T00:00:00Z");
const deal = (id: string, price: number, stock = 1, expires = "2026-11-07T00:00:00Z") => ({
  id, store_category: "음식", discounted_price: price, remaining_stock: stock, expires_at: expires,
});

describe("dinner recommendation safety", () => {
  it("parses common won budgets without guessing unsupported forms", () => {
    expect(parseBudget("혼자 먹을 저녁 만 원 이하")).toBe(10000);
    expect(parseBudget("1만원 미만")).toBe(9999);
    expect(parseBudget("10,000원 이하")).toBe(10000);
    expect(parseBudget("0.5만 원 이하")).toBe(5000);
    expect(parseBudget("5천 원 이하")).toBeNull();
  });
  it("removes sold-out, expired, and over-budget deals", () => {
    const actual = eligibleDinnerDeals([deal("valid", 5000), deal("costly", 10001), deal("sold", 3000, 0), deal("expired", 3000, 1, "2026-11-05T00:00:00Z")], 10000, now);
    expect(actual.map((item) => item.id)).toEqual(["valid"]);
  });
  it("ignores invented or stale IDs, duplicates, and fourth results", () => {
    const fresh = [deal("a", 5000), deal("b", 9000), deal("c", 3000), deal("d", 2000), deal("sold", 1000, 0)];
    const result = verifyDinnerChoices([
      { dealId: "invented", reason: "price" }, { dealId: "sold", reason: "availability" },
      { dealId: "a", reason: "price" }, { dealId: "a", reason: "price" },
      { dealId: "b", reason: "category" }, { dealId: "c", reason: "availability" },
      { dealId: "d", reason: "availability" },
    ], fresh, 10000, now);
    expect(result.map((item) => item.deal.id)).toEqual(["a", "b", "c"]);
    expect(result[0].reason).toContain("5,000원");
  });
});
// [Codex | 2026-11-06] 추천 근거·조건·재조회 검증 테스트
