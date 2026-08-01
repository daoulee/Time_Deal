/**
 * 진행 중인 타임딜 상품을 검색하고 카테고리별로 탐색하는 목록 화면입니다.
 * 공통 ProductCard와 카탈로그 데이터를 사용해 상품 상세 경로로 연결합니다.
 * 검색 결과 없음과 샘플 데이터 상태를 사용자에게 명확히 표시합니다.
 */
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { ProductCard } from "@/shared/components/ProductCard";
import { PRODUCTS } from "@/shared/catalog";
import { StatusBadge } from "@/shared/components/StatusBadge";

const categories = ["전체", ...Array.from(new Set(PRODUCTS.map((item) => item.category)))];
export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const filtered = useMemo(() => PRODUCTS.filter((item) => (category === "전체" || item.category === category) && item.name.includes(query.trim())), [category, query]);
  return <AppShell><section className="page-hero compact"><div><p>PRODUCTS</p><h1>진행 중인 타임딜</h1><span>생활에 필요한 상품을 카테고리와 상품명으로 찾아보세요.</span></div><StatusBadge type="mock">6개 샘플 상품</StatusBadge></section><section className="section-wrap products-page"><div className="catalog-toolbar"><label className="search-field"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명을 검색하세요" aria-label="상품 검색" /></label><div className="category-tabs" aria-label="카테고리 필터">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><button className="filter-button" type="button" disabled title="정렬 기능은 준비 중입니다"><SlidersHorizontal size={18} /> 정렬 <small>준비 중</small></button></div><div className="result-count"><b>{filtered.length}</b>개의 상품</div><div className="product-grid">{filtered.map((item) => <ProductCard key={item.id} product={item} />)}</div>{filtered.length === 0 && <div className="empty-state"><h2>검색 결과가 없습니다.</h2><p>다른 상품명이나 카테고리를 선택해 보세요.</p></div>}</section></AppShell>;
}
