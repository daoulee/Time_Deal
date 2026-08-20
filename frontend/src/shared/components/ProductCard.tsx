/**
 * 상품 이미지·할인 배지·재고 게이지·카운트다운을 보여주는 재사용 딜 카드입니다.
 * HomePage와 ProductsPage의 상품 그리드에서 공통으로 사용합니다.
 * 개발 fixture·운영 데이터 상태와 접근 가능한 이미지 대체 문구를 유지합니다.
 */
import { Link } from "react-router-dom";
import { discountPercentOf, formatPrice, type Product } from "@/shared/catalog";
import { CountdownTimer } from "@/shared/components/CountdownTimer";
import { StockGauge } from "@/shared/components/StockGauge";
import { useCountdown } from "@/shared/hooks/useCountdown";

export function ProductCard({ product }: { product: Product }) {
  const { mode } = useCountdown(product.endsAtIso, product.endsAt);
  const expired = mode === "expired";
  const discount = discountPercentOf(product);
  return (
    <article className={`product-card${expired ? " is-expired" : ""}`}>
      <Link to={`/products/${product.id}`} className="product-media" aria-label={`${product.name} 상세 보기`}>
        <img src={product.image} alt={product.name} loading={product.id === "eggs-30" ? "eager" : "lazy"} />
        <span className={`deal-badge${expired ? " deal-badge-expired" : ""}`}>{expired ? "마감" : `${discount}% OFF`}</span>
      </Link>
      <div className="product-card-body">
        <p className="product-category">{product.category}</p>
        <Link to={`/products/${product.id}`} className="product-name">{product.name}</Link>
        <div className="price-row"><strong>{formatPrice(product.dealPrice)}</strong><del>{formatPrice(product.originalPrice)}</del></div>
        <StockGauge participants={product.participants} target={product.target} />
        <div className="deal-card-footer">
          <span className="deal-participants">{product.participants}명 참여</span>
          <CountdownTimer endsAtIso={product.endsAtIso} fallbackLabel={product.endsAt} />
        </div>
      </div>
    </article>
  );
}
