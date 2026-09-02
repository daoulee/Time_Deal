/**
 * 마감 임박 자동 할인 가격을 계산합니다. 결제 금액은 Postgres 함수 deal_effective_price()
 * (202609020002_deal_auto_discount.sql)가 만드는 게 최종 기준이며, 이 파일은 카탈로그 조회 API가
 * 화면에 보여줄 "지금 이 순간" 가격을 같은 공식으로 계산하기 위한 것입니다(결제에는 쓰이지 않음).
 * 두 구현은 반드시 같은 공식을 유지해야 합니다.
 */
export type AutoDiscountDeal = {
  dealPrice: number;
  endsAt: string;
  autoDiscountEnabled: boolean;
  autoDiscountStartHours: number;
  autoDiscountMaxPercent: number;
};

export function computeEffectiveDealPrice(deal: AutoDiscountDeal): { effectivePrice: number; autoDiscountActive: boolean } {
  const { dealPrice, endsAt, autoDiscountEnabled, autoDiscountStartHours, autoDiscountMaxPercent } = deal;
  if (!autoDiscountEnabled || autoDiscountStartHours <= 0 || autoDiscountMaxPercent <= 0) return { effectivePrice: dealPrice, autoDiscountActive: false };
  const endsAtMs = new Date(endsAt).getTime();
  const startMs = endsAtMs - autoDiscountStartHours * 3_600_000;
  const nowMs = Date.now();
  if (nowMs >= endsAtMs || nowMs < startMs) return { effectivePrice: dealPrice, autoDiscountActive: false };
  const progress = Math.min(1, Math.max(0, (nowMs - startMs) / (endsAtMs - startMs)));
  const extra = Math.round(dealPrice * (autoDiscountMaxPercent / 100) * progress);
  return { effectivePrice: Math.max(0, dealPrice - extra), autoDiscountActive: true };
}
