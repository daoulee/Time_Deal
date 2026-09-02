/**
 * 상품 이미지·할인 배지·재고 게이지·카운트다운을 보여주는 재사용 딜 카드입니다.
 * HomePage와 ProductsPage의 상품 그리드에서 공통으로 사용합니다.
 * 개발 fixture·운영 데이터 상태와 접근 가능한 이미지 대체 문구를 유지합니다.
 */
import { Flame, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { discountPercentOf, formatPrice, type Product } from "@/shared/catalog";
import { CountdownTimer } from "@/shared/components/CountdownTimer";
import { StockGauge } from "@/shared/components/StockGauge";
import { useCountdown } from "@/shared/hooks/useCountdown";

type ProductCardProps = {
  product: Product;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
};

export function ProductCard({ product, isWishlisted, onToggleWishlist }: ProductCardProps) {
  const { mode } = useCountdown(product.endsAtIso, product.endsAt);
  const expired = mode === "expired";
  const discount = discountPercentOf(product);
  return (
    <article className={`product-card${expired ? " is-expired" : ""}`}>
      <Link to={`/products/${product.id}`} className="product-media" aria-label={`${product.name} 상세 보기`}>
        <img src={product.image} alt={product.name} loading={product.id === "eggs-30" ? "eager" : "lazy"} />
        <span className={`deal-badge${expired ? " deal-badge-expired" : ""}`}>{expired ? "마감" : `${discount}% OFF`}</span>
        {onToggleWishlist && (
          <button
            type="button"
            aria-label={isWishlisted ? "찜 해제" : "찜하기"}
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); onToggleWishlist(product.id); }}
            style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Heart size={15} color={isWishlisted ? "#ff5722" : "#94a3b8"} fill={isWishlisted ? "#ff5722" : "none"} />
          </button>
        )}
      </Link>
      <div className="product-card-body">
        <p className="product-category">{product.category}</p>
        <Link to={`/products/${product.id}`} className="product-name">{product.name}</Link>
        <div className="price-row"><strong>{formatPrice(product.dealPrice)}</strong><del>{formatPrice(product.originalPrice)}</del></div>
        {product.autoDiscountActive && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "#ff5722", marginTop: 2 }}>
            <Flame size={11} /> 마감 임박 추가 할인 중
          </span>
        )}
        <StockGauge participants={product.participants} target={product.target} />
        <div className="deal-card-footer">
          <span className="deal-participants">{product.participants}명 참여</span>
          <CountdownTimer endsAtIso={product.endsAtIso} fallbackLabel={product.endsAt} />
        </div>
      </div>
    </article>
  );
}
