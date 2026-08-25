/**
 * 모든 프론트 비즈니스 API 요청을 통과시키는 네트워크 경계입니다.
 * JSON·Bearer 토큰과 고객·판매자·관리자 CRUD 계약의 snake_case 정규화를 한곳에서 처리합니다.
 */
import { apiUrl } from "@/lib/api-base";
import { notifyApiError } from "@/lib/api-error";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth";
import { supabaseAuthClient } from "@/lib/supabase-auth";
import type { AuctionItem, AuctionSettlement, DeliveryMethod } from "@/shared/auction";

export type ApiFetchInit = RequestInit & { auth?: boolean; silent?: boolean };
export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiCallResult<T> = { ok: boolean; status: number; data: T | null; error: { code: string; message: string } | null };
export type RawRecord = Record<string, unknown>;

export async function apiFetch(path: string, init?: ApiFetchInit) {
  const { auth = true, silent = false, ...requestInit } = init ?? {}; const token = auth ? getAuthToken() : "";
  const response = await fetch(apiUrl(path), { ...requestInit, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...requestInit.headers } });
  if (!response.ok) {
    if (response.status === 401 && token) clearAuthToken();
    if (!silent) await notifyApiError(response);
  }
  return response;
}
export async function requestData<T>(path: string, init?: ApiFetchInit): Promise<ApiCallResult<T>> {
  try {
    const response = await apiFetch(path, init); const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
    if (response.ok && payload?.ok) return { ok: true, status: response.status, data: payload.data, error: null };
    const failure = payload && !payload.ok ? payload.error : null; return { ok: false, status: response.status, data: null, error: failure ?? { code: "REQUEST_FAILED", message: "요청을 처리하지 못했습니다." } };
  } catch { return { ok: false, status: 0, data: null, error: { code: "NETWORK_ERROR", message: "백엔드에 연결할 수 없습니다." } }; }
}
const json = (method: string, body?: unknown): ApiFetchInit => ({ method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const value = (record: RawRecord, camel: string, snake: string) => record[camel] ?? record[snake];
const asString = (record: RawRecord, camel: string, snake: string, fallback = "") => { const item = value(record, camel, snake); return typeof item === "string" ? item : fallback; };
const asNumber = (record: RawRecord, camel: string, snake: string, fallback = 0) => { const item = value(record, camel, snake); return typeof item === "number" ? item : Number(item ?? fallback); };
const records = (items: unknown) => Array.isArray(items) ? items.filter((item): item is RawRecord => Boolean(item && typeof item === "object")) : [];

export type PickupLocation = { id: string; name: string; address: string; description: string; isActive: boolean; createdAt?: string };
export type PickupSlot = { id: string; locationId: string; pickupDate: string; startTime: string; endTime: string; pickupAt?: string; capacity: number; reservedCount: number; isActive: boolean };
export type OrderItem = { id?: string; orderId?: string; productId: string; dealId?: string | null; productName: string; unitPrice: number; quantity: number; lineTotal: number };
export type Fulfillment = { id: string; orderId: string; orderNumber: string; pickupLocationId: string; pickupSlotId: string; paymentMethod: string; deliveryAddress?: string | null; status: OrderStatus; pickupStatus: PickupStatus; subtotal: number; createdAt?: string; items: OrderItem[] };
export type Order = { id: string; orderNumber: string; userId?: string; pickupLocationId: string; pickupSlotId: string; subtotal: number; totalAmount: number; orderStatus: OrderStatus | string; paymentMethod: string; paymentStatus: string; pickupStatus: PickupStatus | string; deliveryAddress?: string | null; createdAt?: string; cancelledAt?: string | null; order_items?: OrderItem[]; fulfillment_groups?: RawRecord[] };
export type OrderStatus = "pending" | "confirmed" | "ready" | "completed" | "cancelled";
export type PickupStatus = "pending" | "ready" | "collected" | "no_show" | "cancelled";
export type CreateOrderInput = { pickupLocationId: string; pickupSlotId: string; paymentMethod: "on_site" | "reservation_only" | "card"; idempotencyKey: string; deliveryAddress?: string; items: Array<{ productId: string; dealId?: string; quantity: number }> };
export type ProductInput = { name: string; description: string; category: string; image: string; regularPrice: number; inventory: number };
export type DealInput = { productId: string; dealPrice: number; target: number; startsAt: string; endsAt: string };
export type ProductWithDealInput = ProductInput & { dealPrice: number; target: number; startsAt: string; endsAt: string };
export type InquiryMessage = { id: string; author_id: string; message: string; is_internal?: boolean; created_at: string };
export type Inquiry = RawRecord & { id: string; subject: string; status: string; priority: string; inquiry_messages?: InquiryMessage[] };

const normalizeLocation = (record: RawRecord): PickupLocation => ({ id: asString(record, "id", "id"), name: asString(record, "name", "name"), address: asString(record, "address", "address"), description: asString(record, "description", "description"), isActive: Boolean(value(record, "isActive", "is_active") ?? true), createdAt: asString(record, "createdAt", "created_at") || undefined });
const normalizeSlot = (record: RawRecord): PickupSlot => ({ id: asString(record, "id", "id"), locationId: asString(record, "locationId", "location_id"), pickupDate: asString(record, "pickupDate", "pickup_date"), startTime: asString(record, "startTime", "start_time").slice(0, 5), endTime: asString(record, "endTime", "end_time").slice(0, 5), pickupAt: asString(record, "pickupAt", "pickup_at") || undefined, capacity: asNumber(record, "capacity", "capacity"), reservedCount: asNumber(record, "reservedCount", "reserved_count"), isActive: Boolean(value(record, "isActive", "is_active") ?? true) });
const normalizeOrderItem = (record: RawRecord): OrderItem => ({ id: asString(record, "id", "id") || undefined, orderId: asString(record, "orderId", "order_id") || undefined, productId: asString(record, "productId", "product_id"), dealId: value(record, "dealId", "deal_id") as string | null | undefined, productName: asString(record, "productName", "product_name", "상품"), unitPrice: asNumber(record, "unitPrice", "unit_price"), quantity: asNumber(record, "quantity", "quantity", 1), lineTotal: asNumber(record, "lineTotal", "line_total") });
const normalizeOrder = (record: RawRecord): Order => ({ id: asString(record, "id", "id"), orderNumber: asString(record, "orderNumber", "order_number", asString(record, "id", "id")), userId: asString(record, "userId", "user_id") || undefined, pickupLocationId: asString(record, "pickupLocationId", "pickup_location_id"), pickupSlotId: asString(record, "pickupSlotId", "pickup_slot_id"), subtotal: asNumber(record, "subtotal", "subtotal"), totalAmount: asNumber(record, "totalAmount", "total_amount"), orderStatus: asString(record, "orderStatus", "order_status", "pending"), paymentMethod: asString(record, "paymentMethod", "payment_method", "reservation_only"), paymentStatus: asString(record, "paymentStatus", "payment_status", "not_applicable"), pickupStatus: asString(record, "pickupStatus", "pickup_status", "pending"), deliveryAddress: (value(record, "deliveryAddress", "delivery_address") as string | null | undefined) ?? null, createdAt: asString(record, "createdAt", "created_at") || undefined, cancelledAt: value(record, "cancelledAt", "cancelled_at") as string | null | undefined, order_items: records(value(record, "items", "order_items")).map(normalizeOrderItem), fulfillment_groups: records(value(record, "fulfillmentGroups", "fulfillment_groups")) });
const normalizeFulfillment = (record: RawRecord): Fulfillment => ({ id: asString(record, "id", "id"), orderId: asString(record, "orderId", "order_id"), orderNumber: asString(record, "orderNumber", "order_number"), pickupLocationId: asString(record, "pickupLocationId", "pickup_location_id"), pickupSlotId: asString(record, "pickupSlotId", "pickup_slot_id"), paymentMethod: asString(record, "paymentMethod", "payment_method"), deliveryAddress: (value(record, "deliveryAddress", "delivery_address") as string | null | undefined) ?? null, status: asString(record, "status", "status", "pending") as OrderStatus, pickupStatus: asString(record, "pickupStatus", "pickup_status", "pending") as PickupStatus, subtotal: asNumber(record, "subtotal", "subtotal"), createdAt: asString(record, "createdAt", "created_at") || undefined, items: records(value(record, "items", "order_items")).map(normalizeOrderItem) });

export type ImpactStats = { totalSavings: number; rescuedItems: number; participatingSellers: number; participatingBuyers: number; orderCount: number; generatedAt?: string };
export async function getImpactStats() { return requestData<ImpactStats>("/impact", { auth: false }); }
export async function getMyImpact() { return requestData<{ totalSavings: number; rescuedItems: number; orderCount: number }>("/me/impact"); }

export async function logSearchTerm(term: string) { return requestData<{ logged: boolean }>("/search-log", { ...json("POST", { term }), auth: false, silent: true }); }
export async function getPopularSearchTerms() { return requestData<{ terms: string[] }>("/search-terms/popular", { auth: false, silent: true }); }

export async function getReopenRequestCount(productId: string) { return requestData<{ count: number }>(`/products/${encodeURIComponent(productId)}/reopen-request-count`, { auth: false }); }
export async function toggleReopenRequest(productId: string) { return requestData<{ requested: boolean; count: number }>(`/products/${encodeURIComponent(productId)}/reopen-request`, { method: "POST" }); }
export type SellerReopenRequest = { productId: string; productName: string; requestCount: number; latestRequestedAt: string };
export async function getSellerReopenRequests() { return requestData<{ requests: SellerReopenRequest[] }>("/seller-reopen-requests"); }
export async function getPickupLocations() { const result = await requestData<{ locations?: RawRecord[]; source?: string; notice?: string }>("/pickup-locations", { auth: false }); return { ...result, data: result.data ? { ...result.data, locations: records(result.data.locations).map(normalizeLocation) } : null }; }
export async function getPickupSlots(locationId: string) { const result = await requestData<{ slots?: RawRecord[]; source?: string; notice?: string }>(`/pickup-locations/${encodeURIComponent(locationId)}/slots`, { auth: false }); return { ...result, data: result.data ? { ...result.data, slots: records(result.data.slots).map(normalizeSlot) } : null }; }
export async function createOrder(input: CreateOrderInput) { const result = await requestData<{ order?: RawRecord | null; items?: RawRecord[]; payment?: RawRecord; source?: string }>("/orders", json("POST", input)); return { ...result, data: result.data ? { ...result.data, order: result.data.order ? normalizeOrder(result.data.order) : null, items: records(result.data.items).map(normalizeOrderItem) } : null }; }
export async function getMyOrders() { const result = await requestData<{ orders?: RawRecord[]; source?: string; notice?: string }>("/orders"); return { ...result, data: result.data ? { ...result.data, orders: records(result.data.orders).map(normalizeOrder) } : null }; }
export async function getMyOrder(id: string) { const result = await requestData<{ order?: RawRecord | null; items?: RawRecord[] }>(`/orders/${encodeURIComponent(id)}`); return { ...result, data: result.data ? { ...result.data, order: result.data.order ? normalizeOrder({ ...result.data.order, items: result.data.items }) : null } : null }; }
export async function cancelMyOrder(id: string) { const result = await requestData<{ order?: RawRecord | null }>(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" }); return { ...result, data: result.data ? { ...result.data, order: result.data.order ? normalizeOrder(result.data.order) : null } : null }; }
export async function confirmTossPayment(input: { orderId: string; paymentKey: string; amount: number }) { const result = await requestData<{ order?: RawRecord | null; alreadyPaid?: boolean }>("/payments/toss/confirm", json("POST", input)); return { ...result, data: result.data ? { ...result.data, order: result.data.order ? normalizeOrder(result.data.order) : null } : null }; }

export async function getSellerFulfillments() { const result = await requestData<{ fulfillments?: RawRecord[] }>("/seller/orders"); return { ...result, data: result.data ? { fulfillments: records(result.data.fulfillments).map(normalizeFulfillment) } : null }; }
export async function updateFulfillmentStatus(id: string, status: OrderStatus, pickupStatus?: PickupStatus, isAdmin = false) { const result = await requestData<{ fulfillment?: RawRecord }>(`/${isAdmin ? "admin" : "seller"}/fulfillments/${encodeURIComponent(id)}/status`, json("PATCH", { status, ...(pickupStatus ? { pickupStatus } : {}) })); return { ...result, data: result.data ? { fulfillment: result.data.fulfillment ? normalizeFulfillment(result.data.fulfillment) : null } : null }; }
export type SellerTimedStatus = { status: string; createdAt: string };
export async function getSellerDashboard() { return requestData<{ dashboard: Record<string, number>; fulfillmentGroups: SellerTimedStatus[]; inquiries: SellerTimedStatus[] }>("/seller-dashboard"); }
export type SellerSaleItem = { product_id: string; product_name: string; quantity: number; line_total: number; created_at: string };
export async function getSellerAnalytics() { return requestData<{ products: Array<{ id: string; name: string }>; items: SellerSaleItem[]; pickupStatus: Record<string, number> }>("/seller-analytics"); }
export async function getSellerProducts() { return requestData<{ products: RawRecord[] }>("/seller-products"); }
export async function createSellerProduct(input: ProductInput) { return requestData<{ product: RawRecord }>("/seller-products", json("POST", input)); }
export async function createSellerProductWithDeal(input: ProductWithDealInput) { return requestData<{ product: RawRecord; deal: RawRecord }>("/seller-products-with-deal", json("POST", input)); }
export async function updateSellerProduct(id: string, input: Partial<ProductInput>) { return requestData<{ product: RawRecord }>(`/seller-products/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function submitSellerProduct(id: string) { return requestData<{ product: RawRecord }>(`/seller-products/${encodeURIComponent(id)}/submit`, { method: "POST" }); }
export async function hideSellerProduct(id: string) { return requestData<{ product: RawRecord }>(`/seller-products/${encodeURIComponent(id)}/hide`, { method: "POST" }); }
export async function getProductUploadUrl(id: string, file: File) { return requestData<{ bucket: string; objectPath: string; signedUrl: string; token: string }>(`/seller-products/${encodeURIComponent(id)}/image-upload-url`, json("POST", { fileName: file.name, contentType: file.type, size: file.size })); }
export async function getNewProductUploadUrl(file: File) { return requestData<{ bucket: string; objectPath: string; signedUrl: string; token: string }>("/seller-products/image-upload-url", json("POST", { fileName: file.name, contentType: file.type, size: file.size })); }
export async function getCommunityImageUploadUrl(file: File) { return requestData<{ bucket: string; objectPath: string; signedUrl: string; token: string }>("/community/image-upload-url", json("POST", { fileName: file.name, contentType: file.type, size: file.size })); }
export async function uploadProductImage(bucket: string, objectPath: string, token: string, file: File) {
  if (!supabaseAuthClient) return { ok: false, status: 0, error: "이미지 저장소 환경변수가 필요합니다." };
  const { error } = await supabaseAuthClient.storage.from(bucket).uploadToSignedUrl(objectPath, token, file, { contentType: file.type });
  return { ok: !error, status: error ? 400 : 200, error: error?.message };
}
export async function getSellerDeals() { return requestData<{ deals: RawRecord[] }>("/seller-deals"); }
export async function createSellerDeal(input: DealInput) { return requestData<{ deal: RawRecord }>("/seller-deals", json("POST", input)); }
export async function updateSellerDeal(id: string, input: Partial<Omit<DealInput, "productId">>) { return requestData<{ deal: RawRecord }>(`/seller-deals/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function endSellerDeal(id: string) { return requestData<{ deal: RawRecord }>(`/seller-deals/${encodeURIComponent(id)}/end`, { method: "POST" }); }
export async function getInventoryHistory(productId: string) { return requestData<{ inventory: number; movements: RawRecord[] }>(`/seller-products/${encodeURIComponent(productId)}/inventory`); }
export async function adjustInventory(productId: string, quantityDelta: number, reason: "manual" | "restock") { return requestData<{ product: RawRecord; movement: RawRecord }>(`/seller-products/${encodeURIComponent(productId)}/inventory`, json("POST", { quantityDelta, reason })); }
export async function getSellerPickupLocations() { const result = await requestData<{ locations: RawRecord[] }>("/seller/pickup-locations"); return { ...result, data: result.data ? { locations: records(result.data.locations).map(normalizeLocation) } : null }; }
export async function getSellerPickupSlots() { const result = await requestData<{ slots: RawRecord[] }>("/seller/pickup-slots"); return { ...result, data: result.data ? { slots: records(result.data.slots).map(normalizeSlot) } : null }; }
export async function getSellerInquiries() { return requestData<{ inquiries: Inquiry[] }>("/seller/inquiries"); }
export async function replySellerInquiry(id: string, message: string) { return requestData<{ message: InquiryMessage }>(`/seller/inquiries/${encodeURIComponent(id)}/messages`, json("POST", { message })); }

export async function getAdminOrders() { const result = await requestData<{ orders?: RawRecord[] }>("/admin/orders"); return { ...result, data: result.data ? { orders: records(result.data.orders).map(normalizeOrder) } : null }; }
export async function getAdminDashboard() { return requestData<{ dashboard: Record<string, number>; generatedAt: string }>("/admin-dashboard"); }
export async function getAdminUsers() { return requestData<{ users: RawRecord[] }>("/admin-users"); }
export async function updateAdminUser(id: string, input: { role?: string; isSuspended?: boolean; reason: string }) { return requestData<{ user: RawRecord }>(`/admin-users/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function getSellerApplications() { return requestData<{ applications: RawRecord[] }>("/admin/seller-applications"); }
export async function getAdminRestockRequests() { return requestData<{ requests: RawRecord[] }>("/admin/restock-requests"); }
export async function reviewSellerApplication(id: string, status: "approved" | "rejected", reason: string) { return requestData<{ application: RawRecord }>(`/admin/seller-applications/${encodeURIComponent(id)}`, json("PATCH", { status, reason })); }
export async function getAdminItems(resource: "products" | "deals" | "reviews" | "community" | "community-reports" | "pickup-locations" | "pickup-slots" | "audit-logs" | "auctions") { return requestData<{ items: RawRecord[] }>(`/admin/${resource}`); }
export async function deleteAdminAuction(id: string, reason: string) { return requestData<{ deleted: boolean }>(`/admin/auctions/${encodeURIComponent(id)}`, json("DELETE", { reason })); }
export async function moderateProduct(id: string, status: "active" | "rejected" | "hidden", reason: string) { return requestData<{ product: RawRecord }>(`/admin/products/${encodeURIComponent(id)}`, json("PATCH", { status, reason })); }
export async function moderateDeal(id: string, status: "draft" | "active" | "ended" | "cancelled", reason: string) { return requestData<{ deal: RawRecord }>(`/admin/deals/${encodeURIComponent(id)}`, json("PATCH", { status, reason })); }
export async function moderateContent(resource: "reviews" | "community" | "reports", id: string, status: string, reason: string) { return requestData<{ item: RawRecord }>(`/admin/moderation/${resource}/${encodeURIComponent(id)}`, json("PATCH", { status, reason })); }
export async function createPickupLocation(input: { name: string; address: string; description: string }) { return requestData<{ location: RawRecord }>("/admin/pickup-locations", json("POST", input)); }
export async function updatePickupLocation(id: string, input: Partial<{ name: string; address: string; description: string; isActive: boolean }> & { reason: string }) { return requestData<{ location: RawRecord }>(`/admin/pickup-locations/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function closePickupLocation(id: string, reason: string) { return requestData<{ location: RawRecord }>(`/admin/pickup-locations/${encodeURIComponent(id)}`, json("DELETE", { reason })); }
export async function createPickupSlot(input: { locationId: string; pickupDate: string; startTime: string; endTime: string; pickupAt: string; capacity: number }) { return requestData<{ slot: RawRecord }>("/admin/pickup-slots", json("POST", input)); }
export async function updatePickupSlot(id: string, input: Partial<{ locationId: string; pickupDate: string; startTime: string; endTime: string; pickupAt: string; capacity: number; isActive: boolean }> & { reason: string }) { return requestData<{ slot: RawRecord }>(`/admin/pickup-slots/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function closePickupSlot(id: string, reason: string) { return requestData<{ slot: RawRecord }>(`/admin/pickup-slots/${encodeURIComponent(id)}`, json("DELETE", { reason })); }
export async function getAdminInquiries() { return requestData<{ inquiries: Inquiry[] }>("/admin/inquiries"); }
export async function updateAdminInquiry(id: string, input: { status?: string; priority?: string; assignedTo?: string | null }) { return requestData<{ inquiry: Inquiry }>(`/admin/inquiries/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function replyAdminInquiry(id: string, message: string, isInternal = false) { return requestData<{ message: InquiryMessage }>(`/admin/inquiries/${encodeURIComponent(id)}/messages`, json("POST", { message, isInternal })); }
export async function getAdminResearch() { return requestData<{ research: { generatedAt: string; source: string; categories: Array<{ category: string; productCount: number; averagePrice: number }> } }>("/admin-research"); }

export async function getMyProfile() { return requestData<{ profile: RawRecord }>("/me/profile"); }
export async function updateMyProfile(input: { name?: string; phone?: string; preferredRegion?: string; marketingOptIn?: boolean }) { return requestData<{ profile: RawRecord }>("/me/profile", json("PATCH", input)); }
export async function getMySellerApplication() { return requestData<{ application: RawRecord | null }>("/me/seller-application"); }
export async function applySellerAccount(input: { businessName: string; businessNumber: string }) { return requestData<{ application: RawRecord }>("/me/seller-application", json("POST", input)); }
export async function getMyParticipations() { return requestData<{ participations: RawRecord[] }>("/participations"); }
export async function getMyReviews() { return requestData<{ reviews: RawRecord[] }>("/reviews"); }
export async function createMyReview(input: { orderItemId: string; rating: number; content: string; images?: string[] }) { return requestData<{ review: RawRecord }>("/reviews", json("POST", input)); }
export async function updateMyReview(id: string, input: { rating?: number; content?: string; images?: string[] }) { return requestData<{ review: RawRecord }>(`/reviews/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function deleteMyReview(id: string) { return requestData<{ deleted: boolean }>(`/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export async function getReviewImageUploadUrl(file: File) { return requestData<{ bucket: string; objectPath: string; signedUrl: string; token: string }>("/reviews/image-upload-url", json("POST", { fileName: file.name, contentType: file.type, size: file.size })); }
export async function getProductReviews(productId: string) { return requestData<{ reviews: RawRecord[] }>(`/products/${encodeURIComponent(productId)}/reviews`, { auth: false }); }

export async function getWishlist() { return requestData<{ items: RawRecord[] }>("/wishlist"); }
export async function getWishlistIds() { return requestData<{ productIds: string[] }>("/wishlist/ids"); }
export async function toggleWishlist(productId: string) { return requestData<{ liked: boolean }>(`/wishlist/${encodeURIComponent(productId)}/toggle`, { method: "POST" }); }

export async function getCart(init?: ApiFetchInit) { return requestData<{ items: RawRecord[] }>("/cart", init); }
export async function addToCart(productId: string, quantity = 1) { return requestData<{ item: RawRecord }>("/cart", json("POST", { productId, quantity })); }
export async function updateCartItem(id: string, quantity: number) { return requestData<{ item: RawRecord }>(`/cart/${encodeURIComponent(id)}`, json("PATCH", { quantity })); }
export async function removeCartItem(id: string) { return requestData<{ deleted: boolean }>(`/cart/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export async function clearCart() { return requestData<{ cleared: boolean }>("/cart", { method: "DELETE" }); }

export async function getMyNotifications(init?: ApiFetchInit) { return requestData<{ notifications: RawRecord[]; unreadCount: number }>("/notifications", init); }
export async function markNotificationRead(id: string) { return requestData<{ read: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }); }
export async function markAllNotificationsRead() { return requestData<{ read: boolean }>("/notifications/read-all", { method: "POST" }); }
export async function getMyRestockRequests() { return requestData<{ requests: RawRecord[] }>("/restock-requests"); }
export async function createRestockRequest(orderItemId: string, message: string) { return requestData<{ request: RawRecord }>("/restock-requests", json("POST", { orderItemId, message })); }
export async function getSellerRestockRequests() { return requestData<{ requests: RawRecord[] }>("/seller-restock-requests"); }
export async function replySellerRestockRequest(id: string, input: { expectedRestockDate?: string; sellerReply: string }) { return requestData<{ request: RawRecord }>(`/seller-restock-requests/${encodeURIComponent(id)}`, json("PATCH", input)); }
export async function getMyInquiries() { return requestData<{ inquiries: Inquiry[] }>("/inquiries"); }
export async function replyMyInquiry(id: string, message: string) { return requestData<{ message: InquiryMessage }>(`/inquiries/${encodeURIComponent(id)}/messages`, json("POST", { message })); }

export async function getAuctions() { return requestData<{ auctions: AuctionItem[] }>("/auctions", { auth: false }); }
export async function getAuction(id: string) { return requestData<{ auction: AuctionItem; youAreRestricted: boolean; youAreWinner: boolean }>(`/auctions/${encodeURIComponent(id)}`, { auth: false }); }
export async function placeAuctionBid(id: string, amount: number) { return requestData<{ auction: AuctionItem }>(`/auctions/${encodeURIComponent(id)}/bids`, json("POST", { amount })); }
export async function checkoutAuction(id: string, input: { deliveryMethod: DeliveryMethod; deliveryAddress?: string; parcelPayment?: "prepaid" | "cod" }) { return requestData<{ auction: AuctionItem }>(`/auctions/${encodeURIComponent(id)}/checkout`, json("POST", input)); }
export async function confirmAuctionReceipt(id: string) { return requestData<{ auction: AuctionItem }>(`/auctions/${encodeURIComponent(id)}/confirm-receipt`, { method: "POST" }); }
export async function getMyAuctionOrders() { return requestData<{ orders: RawRecord[] }>("/my-auction-orders"); }
export async function getSellerAuctions() { return requestData<{ auctions: AuctionItem[] }>("/seller-auctions"); }
export async function createSellerAuction(input: { title: string; description: string; origin: string; image: string; startPrice: number; minBidIncrement: number; endsAt: string; allowPickup: boolean; pickupLocation: string; allowQuick: boolean; sellerHandlesDelivery: boolean }) { return requestData<{ auction: AuctionItem }>("/seller-auctions", json("POST", input)); }
export async function getSellerAuctionUploadUrl(file: File) { return requestData<{ bucket: string; objectPath: string; signedUrl: string; token: string }>("/seller-auctions/image-upload-url", json("POST", { fileName: file.name, contentType: file.type, size: file.size })); }
export async function awardSellerAuction(id: string, input: { winnerUserId?: string; finalPrice?: number }) { return requestData<{ auction: AuctionItem }>(`/seller-auctions/${encodeURIComponent(id)}/award`, json("POST", input)); }
export async function submitFloorBid(id: string, amount: number) { return requestData<{ auction: AuctionItem }>(`/seller-auctions/${encodeURIComponent(id)}/floor-bid`, json("POST", { amount })); }
export async function getSellerSettlements() { return requestData<{ settlements: AuctionSettlement[] }>("/seller-settlements"); }

export async function sendEmailOtp(email: string, redirectTo = `${window.location.origin}/auth`) { return apiFetch("/auth/email-otp/send", { ...json("POST", { email, redirectTo }), auth: false }); }
export async function verifyEmailOtp(email: string, token: string) { return apiFetch("/auth/email-otp/verify", { ...json("POST", { email, token, type: "email" }), auth: false }); }
export async function startThirdPartyGoogleAuth(landingPath = window.location.pathname) { const response = await apiFetch("/third-party-google-auth/start", { ...json("POST", { origin: window.location.origin, landing_path: landingPath }), auth: false }); const payload = await response.json() as { ok: boolean; data?: { authUrl?: string; auth_url?: string } }; const authUrl = payload.data?.authUrl ?? payload.data?.auth_url; if (!response.ok || !authUrl) throw new Error("Third-party Google auth start failed"); window.location.assign(authUrl); }
export async function syncAuthTokenFromUrl() { const url = new URL(window.location.href); const token = url.searchParams.get("login_token"); const ts = url.searchParams.get("ts"); const sig = url.searchParams.get("sig"); if (!token || !ts || !sig) return false; const response = await apiFetch("/third-party-google-auth/verify", { ...json("POST", { path: url.pathname, token, ts, sig }), auth: false }).catch(() => null); if (!response?.ok) return false; setAuthToken(token); url.searchParams.delete("login_token"); url.searchParams.delete("ts"); url.searchParams.delete("sig"); window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`); return true; }

// ── 동네 딜(모바일 팀 Supabase 연동) ────────────────────────────
// 우리 웹 로그인과는 독립적인 "모바일 앱 계정"으로 로그인해야 예약·찜이 모바일 앱에도 실시간으로 보인다.
export type NeighborhoodDeal = { id: string; storeId: string; storeName: string; storeCategory: string; title: string; description: string; originalPrice: number; discountedPrice: number; totalStock: number; remainingStock: number; expiresAt: string; imageUrl: string; iconName: string; neighborhood: string | null };
export const normalizeNeighborhoodDeal = (record: RawRecord): NeighborhoodDeal => ({ id: asString(record, "id", "id"), storeId: asString(record, "storeId", "store_id"), storeName: asString(record, "storeName", "store_name"), storeCategory: asString(record, "storeCategory", "store_category"), title: asString(record, "title", "title"), description: asString(record, "description", "description"), originalPrice: asNumber(record, "originalPrice", "original_price"), discountedPrice: asNumber(record, "discountedPrice", "discounted_price"), totalStock: asNumber(record, "totalStock", "total_stock"), remainingStock: asNumber(record, "remainingStock", "remaining_stock"), expiresAt: asString(record, "expiresAt", "expires_at"), imageUrl: asString(record, "imageUrl", "image_url"), iconName: asString(record, "iconName", "icon_name"), neighborhood: (value(record, "neighborhood", "neighborhood") as string | null) ?? null });

export async function getNeighborhoods() { return requestData<{ neighborhoods: string[] }>("/neighborhood/neighborhoods", { auth: false }); }
export async function getNeighborhoodDeals(neighborhood?: string) { return requestData<{ deals: RawRecord[] }>(`/neighborhood/deals${neighborhood ? `?neighborhood=${encodeURIComponent(neighborhood)}` : ""}`, { auth: false }); }

export type MobileAuthSession = { accessToken: string; refreshToken: string; user: { id: string; email: string } };
export async function mobileSignIn(email: string, password: string) { return requestData<MobileAuthSession>("/neighborhood/auth/sign-in", { ...json("POST", { email, password }), auth: false }); }
export async function mobileSignUp(email: string, password: string) { return requestData<{ needsConfirmation: boolean; accessToken: string | null; refreshToken: string | null; user: { id: string; email: string } }>("/neighborhood/auth/sign-up", { ...json("POST", { email, password }), auth: false }); }
export async function mobileRefresh(refreshToken: string) { return requestData<{ accessToken: string; refreshToken: string }>("/neighborhood/auth/refresh", { ...json("POST", { refreshToken }), auth: false }); }

const mobileAuthInit = (mobileToken: string, init?: ApiFetchInit): ApiFetchInit => ({ ...init, auth: false, headers: { ...init?.headers, "X-Mobile-Token": mobileToken } });
export async function getMyNeighborhoodReservations(mobileToken: string) { return requestData<{ reservations: RawRecord[] }>("/neighborhood/me/reservations", mobileAuthInit(mobileToken)); }
export async function getMyNeighborhoodWishlist(mobileToken: string) { return requestData<{ items: RawRecord[] }>("/neighborhood/me/wishlist", mobileAuthInit(mobileToken)); }
export async function reserveNeighborhoodDeal(dealId: string, mobileToken: string) { return requestData<{ reservation: RawRecord }>(`/neighborhood/deals/${encodeURIComponent(dealId)}/reserve`, mobileAuthInit(mobileToken, { method: "POST" })); }
export async function cancelNeighborhoodReservation(reservationId: string, mobileToken: string) { return requestData<{ cancelled: boolean }>(`/neighborhood/reservations/${encodeURIComponent(reservationId)}/cancel`, mobileAuthInit(mobileToken, { method: "POST" })); }
export async function toggleNeighborhoodWishlist(dealId: string, mobileToken: string) { return requestData<{ liked: boolean }>(`/neighborhood/deals/${encodeURIComponent(dealId)}/wishlist/toggle`, mobileAuthInit(mobileToken, { method: "POST" })); }
