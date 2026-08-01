/**
 * 상품 이미지·가격·참여율·상세 링크를 표시하는 재사용 카드입니다.
 * HomePage와 ProductsPage의 상품 그리드에서 공통으로 사용합니다.
 * 샘플·실데이터 상태와 접근 가능한 이미지 대체 문구를 유지합니다.
 */
import { Link } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { formatPrice, progressOf, type Product } from "@/shared/catalog";

export function ProductCard({ product }: { product: Product }) {
  const progress = progressOf(product);
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-media" aria-label={`${product.name} 상세 보기`}>
        <img src={product.image} alt={product.name} loading={product.id === "eggs-30" ? "eager" : "lazy"} />
        <span className="deal-timer"><Clock3 size={14} /> {product.endsAt} 마감</span>
      </Link>
      <div className="product-card-body">
        <p className="product-category">{product.category}</p>
        <Link to={`/products/${product.id}`} className="product-name">{product.name}</Link>
        <div className="price-row"><strong>{formatPrice(product.dealPrice)}</strong><del>{formatPrice(product.originalPrice)}</del></div>
        <div className="progress-copy"><span>{product.participants}명 참여</span><b>{progress}%</b></div>
        <div className="progress-track" aria-label={`목표 달성률 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
      </div>
    </article>
  );
}
