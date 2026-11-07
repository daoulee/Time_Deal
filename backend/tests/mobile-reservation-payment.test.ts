import { describe, expect, it } from "vitest";
import { reservationStatus } from "../src/modules/Mobile/MobileRoutes.js";

describe("mobile reservation-only payment", () => {
  it("does not claim a card hold for a new reservation", () => {
    expect(reservationStatus("pending").payment_status).toBe("not_applicable");
  });
  it("does not claim a charge for a no-show", () => {
    expect(reservationStatus("pending", { status: "completed", pickup_status: "no_show" }).payment_status).toBe("not_applicable");
  });
  it("does not claim a refund for a completed pickup", () => {
    expect(reservationStatus("completed").payment_status).toBe("not_applicable");
  });
  it("reports the stored card payment state without inventing a hold", () => {
    expect(reservationStatus("pending", null, "card", "paid").payment_status).toBe("paid");
    expect(reservationStatus("pending", null, "card").payment_status).toBe("unknown");
  });
});
// [Codex | 2026-11-06] 예약 전용 주문의 잘못된 가결제·청구 표시 회귀 테스트
