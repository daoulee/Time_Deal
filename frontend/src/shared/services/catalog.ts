/**
 * 백엔드 `/api/deals` 응답을 프론트 Product 모델로 변환하는 카탈로그 서비스입니다.
 * Home과 Products 화면이 원격 데이터를 같은 형태로 소비하도록 연결합니다.
 * 요청 실패 시 로컬 샘플로 폴백하되 운영 데이터라는 표시는 하지 않습니다.
 */
import { apiFetch } from "@/lib/api";
import { PRODUCTS, type Product } from "@/shared/catalog";
type ApiDeal = { product?: { id: string; name: string; image: string; category: string; regularPrice: number }; dealPrice: number; participants: number; target: number; endsAt: string };
type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
export async function getCatalog(): Promise<Product[]> {
  try {
    const response = await apiFetch("/deals", { auth: false });
    if (!response.ok) return PRODUCTS;
    const body = (await response.json().catch(() => null)) as ApiEnvelope<{ deals?: ApiDeal[]; source?: "supabase" | "sample" }> | null;
    if (!body?.ok || !body.data.deals?.length) return PRODUCTS;
    return body.data.deals.flatMap((deal) => deal.product ? [{ id: deal.product.id, name: deal.product.name, image: deal.product.image.startsWith("/") ? deal.product.image : `/images/${deal.product.image}`, category: deal.product.category, originalPrice: deal.product.regularPrice, dealPrice: deal.dealPrice, participants: deal.participants, target: deal.target, endsAt: deal.endsAt }] : []);
  } catch { return PRODUCTS; }
}
