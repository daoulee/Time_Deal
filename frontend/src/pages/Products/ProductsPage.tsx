/**
 * 카테고리·소분류·테마(베스트/골든타임 등)로 실제 필터링되는 독립 상품 목록 페이지입니다.
 * 직각 테두리 및 4열 중앙 정렬 스타일을 확실하게 강제 적용했습니다.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StoreHeader } from "@/shared/layout/StoreHeader";
import { SiteFooter } from "@/shared/layout/SiteFooter";
import { ProductCard } from "@/shared/components/ProductCard";
import { discountPercentOf, type Product } from "@/shared/catalog";
import { getCatalog, type CatalogSource } from "@/shared/services/catalog";
import { CATEGORY_GROUPS, THEME_DESCRIPTION, THEME_LABEL, isMorningPick, type ThemeKey } from "@/shared/categoryData";
import { authClient } from "@/lib/auth";
import { getWishlistIds, toggleWishlist } from "@/lib/api";

type SortMode = "recommend" | "new" | "participation" | "discount" | "price-high" | "price-low";
type PriceBucket = "all" | "under10" | "10to20" | "over20";

const SORT_LABELS: Record<SortMode, string> = {
  recommend: "추천순",
  new: "신상품순",
  participation: "판매량순",
  discount: "혜택순",
  "price-high": "높은가격순",
  "price-low": "낮은가격순",
};

const PRICE_LABELS: Record<PriceBucket, string> = {
  all: "전체",
  under10: "1만원 미만",
  "10to20": "1~2만원",
  over20: "2만원 이상",
};

function endingSoonKey(product: Product) {
  return product.endsAtIso ?? product.endsAt;
}

function isThemeKey(value: string | null): value is ThemeKey {
  return !!value && value in THEME_LABEL;
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<CatalogSource>("unavailable");
  const [notice, setNotice] = useState("상품 목록을 불러오는 중입니다.");
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recommend");
  const [priceBucket, setPriceBucket] = useState<PriceBucket>("all");
  const { data: session } = authClient.useSession();
  const [wishlistIds, setWishlistIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    void getCatalog().then((result) => {
      if (!active) return;
      setProducts(result.products);
      setSource(result.source);
      setNotice(result.notice ?? (result.source === "sample" ? "개발 전용 데이터입니다." : "운영 중인 타임딜입니다."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session?.user) { setWishlistIds(null); return; }
    let active = true;
    void getWishlistIds().then((result) => { if (active && result.ok) setWishlistIds(new Set(result.data?.productIds ?? [])); });
    return () => { active = false; };
  }, [session?.user]);

  const handleToggleWishlist = (productId: string) => {
    if (!session?.user) return;
    setWishlistIds((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
    void toggleWishlist(productId);
  };

  const query = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") ?? "";
  const sub = searchParams.get("sub") ?? "";
  const themeParam = searchParams.get("theme");
  const theme = isThemeKey(themeParam) ? themeParam : null;
  const subcategories = category && category in CATEGORY_GROUPS ? CATEGORY_GROUPS[category] : null;

  useEffect(() => { setSortMode("recommend"); }, [category, sub, theme]);

  const filtered = useMemo(() => {
    let list = products;
    if (query) list = list.filter((item) => item.name.includes(query));
    if (category) {
      const byCategory = list.filter((item) => item.category === category);
      if (sub) {
        const bySub = byCategory.filter((item) => item.name.includes(sub) || item.category.includes(sub));
        list = bySub.length ? bySub : byCategory;
      } else {
        list = byCategory;
      }
    }
    if (theme === "morning") list = list.filter(isMorningPick);

    if (priceBucket === "under10") list = list.filter((item) => item.dealPrice < 10000);
    else if (priceBucket === "10to20") list = list.filter((item) => item.dealPrice >= 10000 && item.dealPrice < 20000);
    else if (priceBucket === "over20") list = list.filter((item) => item.dealPrice >= 20000);

    const effectiveSort: SortMode = sortMode !== "recommend" ? sortMode : theme === "best" ? "participation" : theme === "discount" ? "discount" : theme === "new" ? "new" : "recommend";

    const sorted = [...list].sort((a, b) => {
      if (effectiveSort === "price-low") return a.dealPrice - b.dealPrice;
      if (effectiveSort === "price-high") return b.dealPrice - a.dealPrice;
      if (effectiveSort === "participation") return b.participants - a.participants;
      if (effectiveSort === "discount") return discountPercentOf(b) - discountPercentOf(a);
      if (effectiveSort === "new") return a.participants - b.participants;
      if (theme === "goldentime") {
        const discountDiff = discountPercentOf(b) - discountPercentOf(a);
        return discountDiff !== 0 ? discountDiff : endingSoonKey(a).localeCompare(endingSoonKey(b), "ko");
      }
      return endingSoonKey(a).localeCompare(endingSoonKey(b), "ko");
    });
    return sorted;
  }, [products, query, category, sub, priceBucket, sortMode, theme]);

  const title = category || (theme ? THEME_LABEL[theme] : "전체 상품");
  const description = sub ? `${category} > ${sub}` : theme ? THEME_DESCRIPTION[theme] : "생활에 필요한 상품을 카테고리와 상품명으로 찾아보세요.";

  const goToChip = (nextSub?: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextSub) next.set("sub", nextSub); else next.delete("sub");
    setSearchParams(next);
  };

  return (
    <div style={{ width: "100%", background: "#ffffff", minHeight: "100vh" }}>
      {/* ── 강제 직각 테두리 & 카드 스타일 오버라이드 ── */}
      <style>{`
        .custom-square-box,
        .custom-square-box * {
          border-radius: 0px !important;
        }
        .product-card,
        .product-card-thumb,
        .product-card img,
        article,
        article div,
        article img {
          border-radius: 0px !important;
        }
      `}</style>

      <StoreHeader activeTheme={theme ?? undefined} />
      
      {/* ── 본문 컨테이너 (정확히 1050px 기준) ── */}
      <section style={{ width: "100%", maxWidth: "1050px", margin: "0 auto", padding: "0 16px 100px", boxSizing: "border-box" }}>
        
        {/* 상단 타이틀 */}
        <div style={{ textAlign: "center", margin: "40px 0 28px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px 0" }}>{title}</h1>
          <p style={{ fontSize: "14px", color: "#888888", margin: 0 }}>{description}</p>
        </div>

        {/* ── 1. 상단 소분류 카테고리 박스 (완벽한 직각 사각 테두리 + 4열 분할) ── */}
        {subcategories && (
          <div
            className="custom-square-box"
            style={{
              width: "100%",
              margin: "0 auto 36px",
              padding: "24px 32px",
              border: "1px solid #e2e8f0",
              borderRadius: "0px",
              background: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                rowGap: "18px",
                columnGap: "16px",
                alignItems: "center",
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={() => goToChip()}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: "0px",
                  cursor: "pointer",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: sub ? 500 : 700,
                  color: sub ? "#333333" : "#ff5722",
                  padding: "6px 0",
                  transition: "color 0.15s ease",
                }}
              >
                전체보기
              </button>
              {subcategories.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => goToChip(item)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "0px",
                    cursor: "pointer",
                    textAlign: "center",
                    fontSize: "15px",
                    fontWeight: sub === item ? 700 : 500,
                    color: sub === item ? "#ff5722" : "#333333",
                    padding: "6px 0",
                    transition: "color 0.15s ease",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {source !== "supabase" && (
          <div style={{ background: "#f8f9fa", padding: "12px 16px", fontSize: "13px", color: "#666", marginBottom: "20px", border: "1px solid #e2e8f0", borderRadius: "0px" }}>
            {notice}
          </div>
        )}

        {/* ── 2. 메인 컨텐츠 영역 ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "28px", width: "100%", boxSizing: "border-box" }}>
          
          {/* 좌측 가격 필터 (완벽한 직각 사각 테두리) */}
          <aside
            className="custom-square-box"
            style={{
              width: "220px",
              flexShrink: 0,
              border: "1px solid #e2e8f0",
              borderRadius: "0px",
              padding: "24px 20px",
              background: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>
              가격
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {(Object.keys(PRICE_LABELS) as PriceBucket[]).map((bucket) => (
                <label key={bucket} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "#333333" }}>
                  <input
                    type="radio"
                    name="price-bucket"
                    checked={priceBucket === bucket}
                    onChange={() => setPriceBucket(bucket)}
                    style={{ accentColor: "#ff5722", cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <span>{PRICE_LABELS[bucket]}</span>
                </label>
              ))}
            </div>
          </aside>

          {/* 우측 상품 목록 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "14px", color: "#666666" }}>
                총 <b style={{ color: "#1a1a1a", fontWeight: 700 }}>{filtered.length}</b>건의 상품
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {(Object.keys(SORT_LABELS) as SortMode[]).map((mode, idx) => (
                  <div key={mode} style={{ display: "flex", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setSortMode(mode)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: sortMode === mode ? 700 : 400,
                        color: sortMode === mode ? "#ff5722" : "#888888",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {SORT_LABELS[mode]}
                    </button>
                    {idx < Object.keys(SORT_LABELS).length - 1 && (
                      <span style={{ width: 1, height: 11, background: "#e2e8f0", margin: "0 8px", display: "inline-block" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#888888", fontSize: "15px" }}>상품을 불러오는 중입니다.</div>
            ) : filtered.length ? (
              <div className="custom-square-box" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px 20px" }}>
                {filtered.map((item) => (
                  <ProductCard
                    key={`${item.id}-${item.dealId ?? "catalog"}`}
                    product={item}
                    isWishlisted={wishlistIds?.has(item.id) ?? false}
                    onToggleWishlist={session?.user ? handleToggleWishlist : undefined}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <h2 style={{ fontSize: "18px", color: "#333", marginBottom: "8px" }}>표시할 상품이 없습니다.</h2>
                <p style={{ fontSize: "14px", color: "#888" }}>{products.length ? "다른 카테고리나 가격대를 선택해 보세요." : notice}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}