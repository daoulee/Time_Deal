/**
 * 직판장 경매 화면들이 공유하는 타입과 표시용 헬퍼입니다.
 * 백엔드 AuctionRoutes가 이미 camelCase로 응답하므로 프론트에서 별도 매핑이 필요 없습니다.
 */
export type DeliveryMethod = "PICKUP" | "PARCEL" | "QUICK";
export type AuctionStatus = "upcoming" | "live" | "payment_pending" | "escrow_hold" | "completed" | "re_auction" | "cancelled";

export interface AuctionBid {
  userId: string;
  userName: string;
  amount: number;
  bidTime: string;
}

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  origin: string;
  image: string;
  category: string;
  sellerId: string;
  startPrice: number;
  currentPrice: number;
  minBidIncrement: number;
  highestBidderId: string | null;
  status: AuctionStatus;
  endsAt: string;
  paymentDeadline?: string | null;
  deliveryOptions: {
    allowPickup: boolean;
    pickupLocation: string;
    parcelFee: number;
    allowQuick: boolean;
    sellerHandlesDelivery: boolean;
  };
  feePromo: boolean;
  bids: AuctionBid[];
}

export interface AuctionSettlement {
  id: string;
  auction_id: string;
  seller_id: string;
  total_amount: number;
  fee_rate: number;
  fee_amount: number;
  final_settlement_amount: number;
  status: "pending_confirmation" | "ready_to_settle" | "paid";
  created_at: string;
  auction_items?: { title: string; image: string };
}

export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  upcoming: "경매 예정",
  live: "경매중",
  payment_pending: "낙찰(결제대기)",
  escrow_hold: "에스크로 보관중",
  completed: "판매완료",
  re_auction: "재경매",
  cancelled: "취소됨",
};

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  PICKUP: "현장 직접 수령",
  PARCEL: "산지 직송 신선택배",
  QUICK: "당일 특급 퀵",
};

export function feeRateLabel(auction: Pick<AuctionItem, "feePromo" | "deliveryOptions">): string {
  if (auction.feePromo) return "오픈 프로모션 · 수수료 0원";
  return auction.deliveryOptions.sellerHandlesDelivery ? "배송 책임 할인 적용 · 수수료 3%" : "기본 수수료 5%";
}

export function formatCountdown(targetIso: string, nowMs: number): string {
  const diff = new Date(targetIso).getTime() - nowMs;
  if (diff <= 0) return "00:00";
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}시간 ${String(remMinutes).padStart(2, "0")}분`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
