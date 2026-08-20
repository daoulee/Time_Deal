/**
 * 대표 타임딜과 실제 커뮤니티 게시글을 운영 API에서 조회해 제공하는 서비스 홈 화면입니다.
 * 로컬 개발 데이터는 VITE_ENABLE_SAMPLE_DATA=true인 개발 빌드에서만 서비스 계층을 통해 명시적으로 허용합니다.
 */
import { ArrowRight, Clock3, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { AppShell } from "@/shared/layout/AppShell";
import { ProductCard } from "@/shared/components/ProductCard";
import { formatPrice, progressOf, type Product } from "@/shared/catalog";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { getCatalog, type CatalogSource } from "@/shared/services/catalog";

type CommunityPreviewPost = { id: string; title: string; content: string; created_at: string };

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<CatalogSource>("unavailable");
  const [notice, setNotice] = useState("타임딜 목록을 불러오는 중입니다.");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPreviewPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void Promise.all([
      getCatalog(),
      apiFetch("/community?limit=3", { auth: false }).then(async (response) => {
        const body = await response.json().catch(() => null) as { data?: { posts?: CommunityPreviewPost[] } } | null;
        return response.ok ? body?.data?.posts ?? [] : [];
      }).catch(() => [] as CommunityPreviewPost[]),
    ]).then(([catalog, communityPosts]) => {
      if (!active) return;
      setProducts(catalog.products);
      setSource(catalog.source);
      setNotice(catalog.notice ?? (catalog.source === "sample" ? "개발 전용 데이터입니다." : "Supabase 운영 타임딜입니다."));
      setPosts(communityPosts);
    }).finally(() => {
      if (!active) return;
      setLoading(false);
      setCommunityLoading(false);
    });
    return () => { active = false; };
  }, []);
  const product = products[0];
  const totalParticipants = products.reduce((total, item) => total + item.participants, 0);
  return <AppShell>
    <section className="home-hero">
      <div className="hero-copy">
        <div className="eyebrow"><span /> 오늘의 대표 타임딜</div>
        <h1>필요한 만큼 모이면,<br /><em>가격이 내려갑니다.</em></h1>
        <p>동네 이웃과 함께 생활 필수품을 더 합리적으로. 마감 시간과 참여 현황을 확인하고 공동구매에 참여해 보세요.</p>
        <div className="hero-actions">{product ? <Link className="primary-button" to={`/products/${product.id}`}>대표 딜 보기 <ArrowRight size={18} /></Link> : <Link className="primary-button" to="/products">상품 확인 <ArrowRight size={18} /></Link>}<Link className="secondary-button" to="/products">전체 상품</Link></div>
        <div className="trust-row"><span><UsersRound size={18} /> 현재 {totalParticipants}명 참여</span><span><ShieldCheck size={18} /> 안전한 역할별 화면 설계</span></div>
      </div>
      {loading ? <div className="hero-deal-card empty-state">운영 타임딜을 불러오는 중입니다.</div> : product ? <article className="hero-deal-card">
        <div className="hero-image-wrap"><img src={product.image} alt={`${product.name} 대표 타임딜`} /><div className="floating-timer"><Clock3 size={17} /><span>{product.endsAt}</span></div></div>
        <div className="hero-deal-body"><div><StatusBadge type={source === "supabase" ? "live" : "mock"}>{source === "supabase" ? "Supabase 운영 딜" : "개발 전용 딜"}</StatusBadge><h2>{product.name}</h2><p>매일 필요한 상품, 이웃과 함께 목표 인원을 채워요.</p></div><div className="hero-price"><span>타임딜가</span><strong>{formatPrice(product.dealPrice)}</strong><del>{formatPrice(product.originalPrice)}</del></div><div className="progress-copy"><span><b>{product.participants}명</b> 참여 중</span><span>목표 {product.target}명 · {progressOf(product)}%</span></div><div className="progress-track large"><span style={{ width: `${progressOf(product)}%` }} /></div><Link className="primary-button full" to={`/products/${product.id}`}>공동구매 상세 보기</Link></div>
      </article> : <div className="hero-deal-card empty-state"><h2>진행 중인 타임딜이 없습니다.</h2><p>{notice}</p></div>}
    </section>
    <section className="deal-strip" aria-label="타임딜 이용 안내"><div><strong>{products.length}</strong><span>진행 상품</span></div><div><strong>{totalParticipants}</strong><span>총 참여자</span></div><div><strong>2가지</strong><span>예약 방식</span></div><p><MessageCircle size={20} /><span>{notice}</span></p></section>
    <section className="section-wrap"><div className="section-heading"><div><p>TIME DEALS</p><h2>지금 참여 가능한 상품</h2></div><div className="section-heading-actions"><StatusBadge type={source === "supabase" ? "live" : source === "sample" ? "mock" : "ready"}>{source === "supabase" ? "운영 데이터" : source === "sample" ? "개발 전용 데이터" : "조회 결과 없음"}</StatusBadge><Link to="/products">상품 전체 보기 <ArrowRight size={16} /></Link></div></div>{products.length ? <div className="product-grid">{products.map((item) => <ProductCard key={`${item.id}-${item.dealId ?? "catalog"}`} product={item} />)}</div> : !loading && <div className="empty-state"><h2>표시할 상품이 없습니다.</h2><p>{notice}</p></div>}</section>
    <section className="community-preview"><div><p className="section-kicker">COMMUNITY</p><h2>구매 전에 이웃과<br />정보를 나눠보세요.</h2><p>상품 질문, 픽업 일정, 공동구매 의견을 실제 게시글로 확인할 수 있습니다.</p><Link className="secondary-button" to="/community">커뮤니티 둘러보기</Link></div><div className="conversation-card"><StatusBadge type="live">최근 게시글</StatusBadge>{communityLoading ? <p>게시글을 불러오는 중입니다.</p> : posts.length ? posts.map((post) => <Link className="community-preview-post" to="/community" key={post.id}><b>{post.title}</b><small>{post.content}</small><time>{new Date(post.created_at).toLocaleDateString("ko-KR")}</time></Link>) : <p>아직 공개된 게시글이 없습니다.</p>}</div></section>
  </AppShell>;
}
