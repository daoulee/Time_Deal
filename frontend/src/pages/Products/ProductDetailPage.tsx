/**
 * 상품 가격·딜 참여율·수령 정보를 보여주는 상품 상세 화면입니다.
 * Products/Deals 조회 결과와 `/api/participations` 연결 지점을 사용합니다.
 * 현재 미연동 참여 버튼과 샘플 상품 안내를 운영 기능으로 오인시키지 않습니다.
 */
import { Check, Clock3, MapPin, ShieldCheck, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { PRODUCTS, formatPrice, progressOf } from "@/shared/catalog";
import { StatusBadge } from "@/shared/components/StatusBadge";

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = PRODUCTS.find((item) => item.id === id);
  if (!product) return <AppShell><div className="empty-state page-empty"><h1>상품을 찾을 수 없습니다.</h1><Link className="primary-button" to="/products">상품 목록으로</Link></div></AppShell>;
  const progress = progressOf(product);
  return <AppShell><section className="product-detail"><div className="detail-gallery"><img src={product.image} alt={product.name} /><span>대표 이미지 · 실제 로컬 파일</span></div><div className="detail-info"><div className="detail-labels"><StatusBadge type="mock" /><span className="category-pill">{product.category}</span></div><h1>{product.name}</h1><p className="detail-description">목표 인원이 모이면 제안된 타임딜 가격으로 함께 구매하는 샘플 상품입니다.</p><div className="detail-price"><span>타임딜가</span><strong>{formatPrice(product.dealPrice)}</strong><del>{formatPrice(product.originalPrice)}</del></div><div className="detail-progress"><div><span>{product.participants}명 참여 중</span><b>목표 {product.target}명 · {progress}%</b></div><div className="progress-track large"><span style={{ width: `${progress}%` }} /></div><p><Clock3 size={17} /> {product.endsAt}까지</p></div><button type="button" className="primary-button full" disabled>참여하기 · API 연동 준비 중</button><p className="integration-note">참여 요청은 향후 <code>POST /api/participations</code>를 apiFetch로 연결합니다.</p><div className="detail-benefits"><div><Truck /><span><b>수령 안내</b><small>픽업 일정 협의 기능 준비 중</small></span></div><div><MapPin /><span><b>지역 기반</b><small>지역 인증 및 범위 연결 예정</small></span></div><div><ShieldCheck /><span><b>안전한 경계</b><small>로그인·권한 검증 후 참여</small></span></div></div><ul className="detail-checks"><li><Check /> 상품 및 가격은 프로토타입 샘플입니다.</li><li><Check /> 결제와 주문 확정은 아직 연결되지 않았습니다.</li></ul></div></section></AppShell>;
}
