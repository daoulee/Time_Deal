/**
 * 대표 타임딜, 참여 현황, 상품 탐색 진입점을 제공하는 서비스 홈 화면입니다.
 * Products 모듈의 상품·딜 데이터를 조합하고 상품 상세·커뮤니티로 연결합니다.
 * 샘플 데이터와 준비 중 기능의 표시를 운영 상태처럼 보이지 않게 유지합니다.
 */
import { ArrowRight, Clock3, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { ProductCard } from "@/shared/components/ProductCard";
import { FEATURED_PRODUCT, INITIAL_PARTICIPANTS, PRODUCTS, formatPrice, progressOf } from "@/shared/catalog";
import { StatusBadge } from "@/shared/components/StatusBadge";

export default function HomePage() {
  const product = FEATURED_PRODUCT;
  const progress = progressOf(product);
  return <AppShell>
    {/* @section: hero-deal */}
    <section className="home-hero">
      <div className="hero-copy">
        <div className="eyebrow"><span /> 오늘의 대표 타임딜</div>
        <h1>필요한 만큼 모이면,<br /><em>가격이 내려갑니다.</em></h1>
        <p>동네 이웃과 함께 생활 필수품을 더 합리적으로. 마감 시간과 참여 현황을 확인하고 공동구매에 참여해 보세요.</p>
        <div className="hero-actions"><Link className="primary-button" to={`/products/${product.id}`}>대표 딜 보기 <ArrowRight size={18} /></Link><Link className="secondary-button" to="/products">전체 상품</Link></div>
        <div className="trust-row"><span><UsersRound size={18} /> 현재 {INITIAL_PARTICIPANTS}명 참여</span><span><ShieldCheck size={18} /> 안전한 역할별 화면 설계</span></div>
      </div>
      <article className="hero-deal-card">
        <div className="hero-image-wrap"><img src={product.image} alt="신선한 계란 30구 대표 타임딜" /><div className="floating-timer"><Clock3 size={17} /><span>오늘 21:00 마감</span></div></div>
        <div className="hero-deal-body"><div><StatusBadge type="mock" /><h2>{product.name}</h2><p>매일 필요한 신선식품, 이웃과 함께 목표 인원을 채워요.</p></div><div className="hero-price"><span>타임딜가</span><strong>{formatPrice(product.dealPrice)}</strong><del>{formatPrice(product.originalPrice)}</del></div><div className="progress-copy"><span><b>{product.participants}명</b> 참여 중</span><span>목표 {product.target}명 · {progress}%</span></div><div className="progress-track large"><span style={{ width: `${progress}%` }} /></div><Link className="primary-button full" to={`/products/${product.id}`}>공동구매 상세 보기</Link></div>
      </article>
    </section>

    {/* @section: deal-strip */}
    <section className="deal-strip" aria-label="타임딜 이용 안내"><div><strong>6</strong><span>진행 상품</span></div><div><strong>{INITIAL_PARTICIPANTS}</strong><span>총 참여자</span></div><div><strong>24h</strong><span>빠른 마감 확인</span></div><p><MessageCircle size={20} /><span>공동구매방은 현재 <b>Mock UI</b>이며 실시간 채팅 연동 전입니다.</span></p></section>

    {/* @section: product-grid */}
    <section className="section-wrap"><div className="section-heading"><div><p>TIME DEALS</p><h2>지금 참여 가능한 상품</h2></div><Link to="/products">상품 전체 보기 <ArrowRight size={16} /></Link></div><div className="product-grid">{PRODUCTS.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>

    {/* @section: community-preview */}
    <section className="community-preview"><div><p className="section-kicker">COMMUNITY PREVIEW</p><h2>구매 전에 이웃과<br />정보를 나눠보세요.</h2><p>상품 질문, 픽업 일정, 공동구매 의견을 나누는 공간입니다. 현재 게시글·댓글은 샘플입니다.</p><Link className="secondary-button" to="/community">커뮤니티 둘러보기</Link></div><div className="conversation-card"><StatusBadge type="mock">샘플 대화</StatusBadge><div><span className="avatar">김</span><p><b>김타임</b><small>계란 픽업은 주말에도 가능한가요?</small></p></div><div><span className="avatar orange">판</span><p><b>판매자 데모</b><small>현재 일정 협의 기능은 준비 중입니다.</small></p></div><div><span className="avatar">이</span><p><b>이딜</b><small>저도 토요일 오전이면 참여할게요!</small></p></div></div></section>
  </AppShell>;
}
