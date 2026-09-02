/**
 * 백엔드 `/api/deals` 응답을 프론트 Product 모델로 변환합니다.
 * 로컬 개발 fixture는 명시적 VITE_ENABLE_SAMPLE_DATA=true 개발 빌드에서만 허용해 운영 장애를 숨기지 않습니다.
 */
import { apiFetch } from "@/lib/api";
import { PRODUCTS, type Product } from "@/shared/catalog";
type ApiDeal = { id?: string; productId?: string; product_id?: string; product?: { id: string; name: string; image: string; category: string; regularPrice?: number; regular_price?: number }; dealPrice?: number; deal_price?: number; participants: number; target: number; endsAt?: string; ends_at?: string; autoDiscountActive?: boolean };
type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
export type CatalogSource = "supabase" | "sample" | "unavailable";
export type CatalogResult = { products: Product[]; source: CatalogSource; notice?: string };
const sampleEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_SAMPLE_DATA === "true";
const unavailable = (notice: string): CatalogResult => sampleEnabled ? { products: PRODUCTS, source: "sample", notice: `개발 전용 샘플: ${notice}` } : { products: [], source: "unavailable", notice };
export async function getCatalog(): Promise<CatalogResult> {
  try {
    const response = await apiFetch("/deals", { auth: false });
    const body = await response.json().catch(() => null) as ApiEnvelope<{ deals?: ApiDeal[]; source?: CatalogSource; notice?: string }> | null;
    if (!response.ok || !body?.ok) return unavailable("타임딜을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    const products = (body.data.deals ?? []).flatMap((deal): Product[] => {
      if (!deal.product) return []; const productId = deal.product.id || deal.productId || deal.product_id; if (!productId || !deal.id) return [];
      const image = deal.product.image; const imageUrl = /^https?:\/\//.test(image) || image.startsWith("/") ? image : `/images/${image}`;
      const endsAtIso = deal.endsAt ?? deal.ends_at;
      const endsAt = endsAtIso ? new Date(endsAtIso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "마감 시간 미정";
      return [{ id: productId, dealId: deal.id, name: deal.product.name, image: imageUrl, category: deal.product.category, originalPrice: deal.product.regularPrice ?? deal.product.regular_price ?? 0, dealPrice: deal.dealPrice ?? deal.deal_price ?? 0, participants: deal.participants, target: deal.target, endsAt, endsAtIso, autoDiscountActive: deal.autoDiscountActive ?? false }];
    });
    return products.length ? { products, source: body.data.source ?? "supabase", notice: body.data.notice } : unavailable("현재 진행 중인 타임딜이 없습니다.");
  } catch { return unavailable("백엔드에 연결할 수 없습니다."); }
}
