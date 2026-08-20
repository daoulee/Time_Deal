/**
 * 진행 중인 타임딜을 운영 API에서 조회하고 검색·카테고리·정렬 기능을 제공하는 상품 목록 화면입니다.
 * 개발 데이터는 VITE_ENABLE_SAMPLE_DATA=true인 개발 빌드에서만 서비스 계층을 통해 명시적으로 허용합니다.
 */
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { ProductCard } from "@/shared/components/ProductCard";
import { type Product } from "@/shared/catalog";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { getCatalog, type CatalogSource } from "@/shared/services/catalog";

type SortMode = "closing" | "price-low" | "price-high" | "participation";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<CatalogSource>("unavailable");
  const [notice, setNotice] = useState("상품 목록을 불러오는 중입니다.");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [sortMode, setSortMode] = useState<SortMode>("closing");
  const categories = useMemo(() => ["전체", ...Array.from(new Set(products.map((item) => item.category)))], [products]);
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
  useEffect(() => { if (category !== "전체" && !categories.includes(category)) setCategory("전체"); }, [category, categories]);
  const filtered = useMemo(() => {
    const result = products.filter((item) => (category === "전체" || item.category === category) && item.name.includes(query.trim()));
    return [...result].sort((a, b) => sortMode === "price-low" ? a.dealPrice - b.dealPrice : sortMode === "price-high" ? b.dealPrice - a.dealPrice : sortMode === "participation" ? b.participants - a.participants : (a.endsAtIso ?? a.endsAt).localeCompare(b.endsAtIso ?? b.endsAt, "ko"));
  }, [category, products, query, sortMode]);
  return <AppShell><section className="page-hero compact"><div><p>PRODUCTS</p><h1>진행 중인 타임딜</h1><span>생활에 필요한 상품을 카테고리와 상품명으로 찾아보세요.</span></div><StatusBadge type={source === "supabase" ? "live" : source === "sample" ? "mock" : "ready"}>{source === "supabase" ? "운영 딜" : source === "sample" ? "개발 전용 딜" : "조회 결과 없음"}</StatusBadge></section><section className="section-wrap products-page"><div className="order-notice">{notice}</div><div className="catalog-toolbar"><label className="search-field"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명을 검색하세요" aria-label="상품 검색" /></label><div className="category-tabs" aria-label="카테고리 필터">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="filter-button"><SlidersHorizontal size={18} /><span>정렬</span><select aria-label="상품 정렬" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="closing">마감순</option><option value="price-low">낮은 가격순</option><option value="price-high">높은 가격순</option><option value="participation">참여 많은순</option></select></label></div><div className="result-count"><b>{filtered.length}</b>개의 상품</div>{loading ? <div className="empty-state">상품을 불러오는 중입니다.</div> : filtered.length ? <div className="product-grid">{filtered.map((item) => <ProductCard key={`${item.id}-${item.dealId ?? "catalog"}`} product={item} />)}</div> : <div className="empty-state"><h2>표시할 상품이 없습니다.</h2><p>{products.length ? "다른 상품명이나 카테고리를 선택해 보세요." : notice}</p></div>}</section></AppShell>;
}
