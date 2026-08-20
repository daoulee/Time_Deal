/**
 * 직판장 경매(어업 직판장 실시간 경매) 공개 조회·입찰·결제·구매확정과 판매자 등록·정산 조회를 제공합니다.
 * 5분 결제 타임아웃·재경매 전환·미결제 재입찰 영구 제한은 백그라운드 작업 없이
 * 매 요청 시작 시 expireAuctions()로 지연 평가(lazy expiry)해 상태를 최신으로 맞춥니다.
 * 낙찰 대금은 즉시 정산하지 않고 auction_settlements에 에스크로 보관 상태로 기록합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { config } from "../../config.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";
import { notifyUser } from "../../notify.js";

export const auctionRouter = new Hono();
const sellerOnly = requireRole("seller", "admin");
const PAYMENT_WINDOW_MS = 5 * 60 * 1000;
const RE_AUCTION_WINDOW_MS = 10 * 60 * 1000;

const imagePath = z.string().min(3).max(500).regex(/^[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/i);
const publicImageUrl = (objectPath: string) => getAdminSupabase().storage.from(config.productImageBucket).getPublicUrl(objectPath).data.publicUrl;
const imageUploadRequest = z.object({ fileName: z.string().min(1).max(120).regex(/\.(?:jpe?g|png|webp)$/i), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(config.maxImageBytes) }).strict();

type AuctionRow = Record<string, any>;
type BidRow = Record<string, any>;

const mapAuction = (row: AuctionRow, bids: BidRow[] = []) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  origin: row.origin,
  image: row.image,
  category: row.category,
  sellerId: row.seller_id,
  startPrice: row.start_price,
  currentPrice: row.current_price,
  minBidIncrement: row.min_bid_increment,
  highestBidderId: row.highest_bidder_id,
  status: row.status,
  endsAt: row.ends_at,
  paymentDeadline: row.payment_deadline,
  deliveryOptions: {
    allowPickup: row.allow_pickup,
    pickupLocation: row.pickup_location,
    parcelFee: row.parcel_fee,
    allowQuick: row.allow_quick,
    sellerHandlesDelivery: row.seller_handles_delivery,
  },
  feePromo: row.fee_promo,
  bids: bids.map((bid) => ({ userId: bid.user_id, userName: bid.profiles?.name ?? "이웃", amount: bid.amount, bidTime: bid.created_at })),
});

// 낙관적 지연 만료: live→payment_pending(낙찰 있음)/completed(유찰), payment_pending→re_auction(+페널티)
async function expireAuctions() {
  const supabase = getAdminSupabase();
  const nowIso = new Date().toISOString();
  const { data: liveExpired } = await supabase.from("auction_items").select("id,title,highest_bidder_id,ends_at").eq("status", "live").lte("ends_at", nowIso);
  for (const row of liveExpired ?? []) {
    if (row.highest_bidder_id) {
      const deadline = new Date(new Date(row.ends_at).getTime() + PAYMENT_WINDOW_MS).toISOString();
      await supabase.from("auction_items").update({ status: "payment_pending", payment_deadline: deadline, updated_at: nowIso }).eq("id", row.id);
      void notifyUser(row.highest_bidder_id, "auction_won", `[${row.title}] 경매에 낙찰되었어요`, "5분 안에 결제하지 않으면 낙찰이 취소되고 재입찰이 제한됩니다.", `/auction/${row.id}`);
    } else {
      await supabase.from("auction_items").update({ status: "completed", updated_at: nowIso }).eq("id", row.id);
    }
  }
  const { data: pendingExpired } = await supabase.from("auction_items").select("id,highest_bidder_id,start_price").eq("status", "payment_pending").lte("payment_deadline", nowIso);
  for (const row of pendingExpired ?? []) {
    if (row.highest_bidder_id) {
      await supabase.from("auction_penalties").upsert({ auction_id: row.id, user_id: row.highest_bidder_id, reason: "payment_timeout" }, { onConflict: "auction_id,user_id", ignoreDuplicates: true });
    }
    const newEndsAt = new Date(Date.now() + RE_AUCTION_WINDOW_MS).toISOString();
    await supabase.from("auction_items").update({ status: "live", current_price: row.start_price, highest_bidder_id: null, payment_deadline: null, ends_at: newEndsAt, updated_at: nowIso }).eq("id", row.id);
  }
}

auctionRouter.get("/auctions", async (context) => {
  await expireAuctions();
  const { data, error } = await getAdminSupabase().from("auction_items").select("*").order("status", { ascending: true }).order("ends_at", { ascending: true });
  return error ? context.json(apiFailure("QUERY_FAILED", "경매 목록을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ auctions: (data ?? []).map((row) => mapAuction(row)) }));
});

auctionRouter.get("/auctions/:id", async (context) => {
  await expireAuctions();
  const supabase = getAdminSupabase();
  const { data: row, error } = await supabase.from("auction_items").select("*").eq("id", context.req.param("id")).maybeSingle();
  if (error || !row) return context.json(apiFailure("NOT_FOUND", "경매를 찾을 수 없습니다."), 404);
  const { data: bids } = await supabase.from("auction_bids").select("*,profiles(name)").eq("auction_id", row.id).order("created_at", { ascending: false }).limit(50);
  const currentUserId = context.var.currentUser?.id;
  let restricted = false;
  if (currentUserId) {
    const { data: penalty } = await supabase.from("auction_penalties").select("id").eq("auction_id", row.id).eq("user_id", currentUserId).maybeSingle();
    restricted = Boolean(penalty);
  }
  return context.json(apiSuccess({ auction: mapAuction(row, bids ?? []), youAreRestricted: restricted, youAreWinner: currentUserId ? currentUserId === row.highest_bidder_id : false }));
});

const bidInput = z.object({ amount: z.number().int().positive() }).strict();
auctionRouter.post("/auctions/:id/bids", requireAuth, async (context) => {
  await expireAuctions();
  const parsed = bidInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "입찰 금액을 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const userId = context.var.currentUser!.id;
  const { data: auction } = await supabase.from("auction_items").select("*").eq("id", context.req.param("id")).maybeSingle();
  if (!auction) return context.json(apiFailure("NOT_FOUND", "경매를 찾을 수 없습니다."), 404);
  if (auction.status !== "live") return context.json(apiFailure("AUCTION_NOT_LIVE", "현재 입찰할 수 없는 경매입니다."), 409);
  if (auction.seller_id === userId) return context.json(apiFailure("SELF_BID_FORBIDDEN", "본인이 등록한 경매에는 입찰할 수 없습니다."), 403);
  const { data: penalty } = await supabase.from("auction_penalties").select("id").eq("auction_id", auction.id).eq("user_id", userId).maybeSingle();
  if (penalty) return context.json(apiFailure("BID_RESTRICTED", "미결제 이력으로 이 상품에는 재입찰할 수 없습니다."), 403);
  const minAmount = auction.highest_bidder_id || auction.current_price > auction.start_price ? auction.current_price + auction.min_bid_increment : auction.current_price;
  if (parsed.data.amount < minAmount) return context.json(apiFailure("BID_TOO_LOW", `최소 ${minAmount.toLocaleString()}원 이상 입찰해야 합니다.`), 400);
  const { error: bidError } = await supabase.from("auction_bids").insert({ auction_id: auction.id, user_id: userId, amount: parsed.data.amount });
  if (bidError) return context.json(apiFailure("SAVE_FAILED", "입찰을 저장하지 못했습니다."), 400);
  const { data: updated, error: updateError } = await supabase.from("auction_items").update({ current_price: parsed.data.amount, highest_bidder_id: userId, updated_at: new Date().toISOString() }).eq("id", auction.id).select().single();
  if (updateError || !updated) return context.json(apiFailure("SAVE_FAILED", "경매 현재가를 갱신하지 못했습니다."), 400);
  return context.json(apiSuccess({ auction: mapAuction(updated) }), 201);
});

const checkoutInput = z.object({ deliveryMethod: z.enum(["PICKUP", "PARCEL", "QUICK"]), deliveryAddress: z.string().max(300).optional(), parcelPayment: z.enum(["prepaid", "cod"]).optional() }).strict();
auctionRouter.post("/auctions/:id/checkout", requireAuth, async (context) => {
  await expireAuctions();
  const parsed = checkoutInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "수령 방식을 확인하세요."), 400);
  if (parsed.data.deliveryMethod !== "PICKUP" && !parsed.data.deliveryAddress?.trim()) return context.json(apiFailure("ADDRESS_REQUIRED", "배송 주소를 입력하세요."), 400);
  const supabase = getAdminSupabase();
  const userId = context.var.currentUser!.id;
  const { data: auction } = await supabase.from("auction_items").select("*").eq("id", context.req.param("id")).maybeSingle();
  if (!auction) return context.json(apiFailure("NOT_FOUND", "경매를 찾을 수 없습니다."), 404);
  if (auction.status !== "payment_pending" || auction.highest_bidder_id !== userId) return context.json(apiFailure("NOT_WINNER", "결제 대상 낙찰자가 아닙니다."), 403);
  if (auction.payment_deadline && new Date(auction.payment_deadline).getTime() < Date.now()) return context.json(apiFailure("PAYMENT_EXPIRED", "결제 시간이 초과되어 재경매로 전환되었습니다."), 409);
  const deliveryFee = parsed.data.deliveryMethod === "PARCEL" && parsed.data.parcelPayment !== "cod" ? auction.parcel_fee : 0;
  const totalAmount = auction.current_price + deliveryFee;
  const { error: orderError } = await supabase.from("auction_orders").insert({ auction_id: auction.id, buyer_id: userId, delivery_method: parsed.data.deliveryMethod, delivery_address: parsed.data.deliveryAddress ?? null, parcel_payment: parsed.data.parcelPayment ?? null, delivery_fee: deliveryFee, winning_amount: auction.current_price, total_amount: totalAmount });
  if (orderError) return context.json(apiFailure("SAVE_FAILED", "주문 정보를 저장하지 못했습니다."), 400);
  const feeRate = auction.fee_promo ? 0 : auction.seller_handles_delivery ? 0.03 : 0.05;
  const feeAmount = Math.round(auction.current_price * feeRate);
  const { error: settlementError } = await supabase.from("auction_settlements").insert({ auction_id: auction.id, seller_id: auction.seller_id, total_amount: auction.current_price, fee_rate: feeRate, fee_amount: feeAmount, final_settlement_amount: auction.current_price - feeAmount, status: "pending_confirmation" });
  if (settlementError) return context.json(apiFailure("SAVE_FAILED", "정산 정보를 저장하지 못했습니다."), 400);
  const { data: updated } = await supabase.from("auction_items").update({ status: "escrow_hold", updated_at: new Date().toISOString() }).eq("id", auction.id).select().single();
  return context.json(apiSuccess({ auction: mapAuction(updated) }));
});

auctionRouter.post("/auctions/:id/confirm-receipt", requireAuth, async (context) => {
  const supabase = getAdminSupabase();
  const userId = context.var.currentUser!.id;
  const { data: order } = await supabase.from("auction_orders").select("*").eq("auction_id", context.req.param("id")).eq("buyer_id", userId).maybeSingle();
  if (!order) return context.json(apiFailure("NOT_FOUND", "낙찰 주문을 찾을 수 없습니다."), 404);
  if (order.buyer_confirmed_at) return context.json(apiFailure("ALREADY_CONFIRMED", "이미 구매 확정된 주문입니다."), 409);
  await supabase.from("auction_orders").update({ buyer_confirmed_at: new Date().toISOString() }).eq("id", order.id);
  await supabase.from("auction_settlements").update({ status: "ready_to_settle", updated_at: new Date().toISOString() }).eq("auction_id", order.auction_id);
  const { data: updated } = await supabase.from("auction_items").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", order.auction_id).select().single();
  return context.json(apiSuccess({ auction: mapAuction(updated) }));
});

auctionRouter.get("/my-auction-orders", requireAuth, async (context) => {
  const { data, error } = await getAdminSupabase().from("auction_orders").select("*,auction_items(title,image,origin,current_price,status)").eq("buyer_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "낙찰 내역을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ orders: data ?? [] }));
});

const auctionCreate = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).default(""),
  origin: z.string().min(1).max(120),
  image: imagePath,
  startPrice: z.number().int().min(0),
  minBidIncrement: z.number().int().positive().default(1000),
  endsAt: z.string().datetime().refine((value) => new Date(value).getTime() > Date.now() + 5 * 60 * 1000, "경매 마감 시각은 최소 5분 이후로 설정해야 합니다."),
  allowPickup: z.boolean().default(true),
  pickupLocation: z.string().max(200).default(""),
  allowQuick: z.boolean().default(true),
  sellerHandlesDelivery: z.boolean().default(false),
}).strict();

auctionRouter.get("/seller-auctions", sellerOnly, async (context) => {
  await expireAuctions();
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.from("auction_items").select("*").eq("seller_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  if (error) return context.json(apiFailure("QUERY_FAILED", "경매를 조회하지 못했습니다."), 502);
  const ids = (data ?? []).map((row) => row.id);
  const bidsByAuction = new Map<string, BidRow[]>();
  if (ids.length) {
    const { data: bids } = await supabase.from("auction_bids").select("*,profiles(name)").in("auction_id", ids).order("created_at", { ascending: false });
    for (const bid of bids ?? []) { const list = bidsByAuction.get(bid.auction_id) ?? []; list.push(bid); bidsByAuction.set(bid.auction_id, list); }
  }
  return context.json(apiSuccess({ auctions: (data ?? []).map((row) => mapAuction(row, bidsByAuction.get(row.id) ?? [])) }));
});
auctionRouter.post("/seller-auctions", sellerOnly, async (context) => {
  const parsed = auctionCreate.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "경매 정보를 확인하세요.", parsed.error.flatten()), 400);
  const image = publicImageUrl(parsed.data.image);
  const { data, error } = await getAdminSupabase().from("auction_items").insert({
    seller_id: context.var.currentUser!.id, title: parsed.data.title, description: parsed.data.description, origin: parsed.data.origin, image,
    category: "수산물", start_price: parsed.data.startPrice, current_price: parsed.data.startPrice, min_bid_increment: parsed.data.minBidIncrement,
    status: "live", ends_at: parsed.data.endsAt, allow_pickup: parsed.data.allowPickup, pickup_location: parsed.data.pickupLocation,
    parcel_fee: 5000, allow_quick: parsed.data.allowQuick, seller_handles_delivery: parsed.data.sellerHandlesDelivery, fee_promo: true,
  }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "경매를 등록하지 못했습니다."), 400) : context.json(apiSuccess({ auction: mapAuction(data) }), 201);
});
const floorBidInput = z.object({ amount: z.number().int().positive() }).strict();
auctionRouter.post("/seller-auctions/:id/floor-bid", sellerOnly, async (context) => {
  const parsed = floorBidInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "현장 호가 금액을 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: auction } = await supabase.from("auction_items").select("*").eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).maybeSingle();
  if (!auction) return context.json(apiFailure("NOT_FOUND", "본인 경매를 찾을 수 없습니다."), 404);
  if (auction.status !== "live") return context.json(apiFailure("AUCTION_NOT_LIVE", "진행 중인 경매만 현장 호가를 반영할 수 있습니다."), 409);
  const minAmount = auction.highest_bidder_id || auction.current_price > auction.start_price ? auction.current_price + auction.min_bid_increment : auction.current_price;
  if (parsed.data.amount < minAmount) return context.json(apiFailure("BID_TOO_LOW", `현장 호가는 최소 ${minAmount.toLocaleString()}원 이상이어야 합니다.`), 400);
  await supabase.from("auction_bids").insert({ auction_id: auction.id, user_id: context.var.currentUser!.id, amount: parsed.data.amount });
  const { data: updated, error } = await supabase.from("auction_items").update({ current_price: parsed.data.amount, highest_bidder_id: null, updated_at: new Date().toISOString() }).eq("id", auction.id).select().single();
  return error || !updated ? context.json(apiFailure("SAVE_FAILED", "현장 호가를 반영하지 못했습니다."), 400) : context.json(apiSuccess({ auction: mapAuction(updated) }));
});
const awardInput = z.object({ winnerUserId: z.string().uuid().optional(), finalPrice: z.number().int().min(0).optional() }).strict();
auctionRouter.post("/seller-auctions/:id/award", sellerOnly, async (context) => {
  const parsed = awardInput.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "낙찰 정보를 확인하세요."), 400);
  const supabase = getAdminSupabase();
  const { data: auction } = await supabase.from("auction_items").select("*").eq("id", context.req.param("id")).eq("seller_id", context.var.currentUser!.id).maybeSingle();
  if (!auction) return context.json(apiFailure("NOT_FOUND", "본인 경매를 찾을 수 없습니다."), 404);
  if (auction.status !== "live") return context.json(apiFailure("AUCTION_NOT_LIVE", "진행 중인 경매만 낙찰 처리할 수 있습니다."), 409);
  const winnerId = parsed.data.winnerUserId ?? auction.highest_bidder_id;
  if (!winnerId) return context.json(apiFailure("NO_BIDDER", "낙찰자로 지정할 입찰자가 없습니다. 온라인 입찰이 최소 1건 필요합니다."), 400);
  if (parsed.data.winnerUserId) {
    const { data: bidExists } = await supabase.from("auction_bids").select("id").eq("auction_id", auction.id).eq("user_id", parsed.data.winnerUserId).limit(1).maybeSingle();
    if (!bidExists) return context.json(apiFailure("INVALID_WINNER", "해당 사용자는 이 경매에 입찰한 기록이 없습니다."), 400);
  }
  const finalPrice = parsed.data.finalPrice ?? auction.current_price;
  if (finalPrice < auction.start_price) return context.json(apiFailure("INVALID_PRICE", "낙찰가는 시작가보다 낮을 수 없습니다."), 400);
  const nowIso = new Date().toISOString();
  if (finalPrice !== auction.current_price || winnerId !== auction.highest_bidder_id) {
    await supabase.from("auction_bids").insert({ auction_id: auction.id, user_id: winnerId, amount: finalPrice });
  }
  const paymentDeadline = new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString();
  const { data: updated, error } = await supabase.from("auction_items").update({ status: "payment_pending", highest_bidder_id: winnerId, current_price: finalPrice, ends_at: nowIso, payment_deadline: paymentDeadline, updated_at: nowIso }).eq("id", auction.id).select().single();
  if (!error && updated) void notifyUser(winnerId, "auction_won", `[${updated.title}] 경매에 낙찰되었어요`, "5분 안에 결제하지 않으면 낙찰이 취소되고 재입찰이 제한됩니다.", `/auction/${updated.id}`);
  return error || !updated ? context.json(apiFailure("SAVE_FAILED", "낙찰 처리를 저장하지 못했습니다."), 400) : context.json(apiSuccess({ auction: mapAuction(updated) }));
});
auctionRouter.post("/seller-auctions/image-upload-url", sellerOnly, async (context) => {
  const parsed = imageUploadRequest.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_IMAGE", "JPG·PNG·WEBP 이미지만 제한 크기 내에서 업로드할 수 있습니다."), 400);
  const objectPath = `auction/${context.var.currentUser!.id}/${crypto.randomUUID()}-${parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { data, error } = await getAdminSupabase().storage.from(config.productImageBucket).createSignedUploadUrl(objectPath);
  return error ? context.json(apiFailure("UPLOAD_URL_FAILED", "이미지 업로드 URL을 만들지 못했습니다."), 502) : context.json(apiSuccess({ bucket: config.productImageBucket, objectPath, signedUrl: data.signedUrl, token: data.token }));
});

auctionRouter.get("/seller-settlements", sellerOnly, async (context) => {
  const { data, error } = await getAdminSupabase().from("auction_settlements").select("*,auction_items(title,image)").eq("seller_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "정산 내역을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ settlements: data ?? [] }));
});
