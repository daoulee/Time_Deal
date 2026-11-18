/** 추천 결과는 서버가 재조회한 딜의 확인 가능한 사실만 사용한다. */
export type DinnerCandidate = {
  id: string;
  store_category: string;
  discounted_price: number;
  remaining_stock: number;
  expires_at: string;
};
export type DinnerChoice = { dealId: string; reason: "price" | "category" | "availability" };

export function parseBudget(query: string): number | null {
  const text = query.replaceAll(",", "");
  const tenThousands = text.match(/(?:(\d+(?:\.\d+)?)\s*)?만\s*원\s*(이하|미만|까지)/);
  if (tenThousands) {
    const amount = Math.floor(Number(tenThousands[1] ?? 1) * 10000);
    return Math.max(0, amount - (tenThousands[2] === "미만" ? 1 : 0));
  }
  const won = text.match(/(\d+)\s*원\s*(이하|미만|까지)/);
  if (!won) return null;
  return Math.max(0, Number(won[1]) - (won[2] === "미만" ? 1 : 0));
}

export function eligibleDinnerDeals<T extends DinnerCandidate>(deals: T[], budget: number | null, now = Date.now()): T[] {
  return deals.filter((deal) => Number.isFinite(deal.discounted_price) && deal.discounted_price >= 0 &&
    Number.isFinite(deal.remaining_stock) && deal.remaining_stock > 0 &&
    Number.isFinite(Date.parse(deal.expires_at)) && Date.parse(deal.expires_at) > now &&
    (budget === null || deal.discounted_price <= budget));
}

export function verifyDinnerChoices<T extends DinnerCandidate>(choices: DinnerChoice[], freshDeals: T[], budget: number | null, now = Date.now()) {
  const allowed = new Map(eligibleDinnerDeals(freshDeals, budget, now).map((deal) => [deal.id, deal]));
  const used = new Set<string>();
  return choices.flatMap((choice) => {
    const deal = allowed.get(choice.dealId);
    if (!deal || used.has(deal.id) || used.size >= 3) return [];
    used.add(deal.id);
    const reason = choice.reason === "price" && budget !== null
      ? `요청한 예산 안의 ${deal.discounted_price.toLocaleString("ko-KR")}원 딜이에요.`
      : choice.reason === "category"
        ? `${deal.store_category} 카테고리의 딜이에요.`
        : `현재 ${deal.remaining_stock}개가 남아 있어요.`;
    return [{ deal, reason }];
  });
}
// [Codex | 2026-11-06] 추천 검증 — 실재·재고·마감·명시적 예산 및 중복 검사
