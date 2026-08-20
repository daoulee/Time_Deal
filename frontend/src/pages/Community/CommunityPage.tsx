/**
 * 이웃 게시글을 실제 API로 조회하고 로그인 사용자가 작성·좋아요 할 수 있는 커뮤니티 화면입니다.
 * 정적 개발 글 없이 로딩·빈 상태·오류·작성 상태를 명확하게 표시합니다.
 */
import { type FormEvent, useEffect, useState } from "react";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { authClient } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
interface Post { id: string; title: string; content: string; created_at: string; purchase_intent: boolean; community_comments?: Array<{ count: number }>; community_reactions?: Array<{ count: number }> }
export default function CommunityPage() {
  const { data: session } = authClient.useSession(); const [posts, setPosts] = useState<Post[]>([]); const [loading, setLoading] = useState(true); const [writing, setWriting] = useState(false); const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [error, setError] = useState("");
  const load = async () => { setLoading(true); const response = await apiFetch("/community?limit=30", { auth: false }); const body = await response.json().catch(() => null) as { data?: { posts?: Post[] } } | null; if (response.ok) setPosts(body?.data?.posts ?? []); else setError("게시글을 불러오지 못했습니다."); setLoading(false); };
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); const response = await apiFetch("/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content, purchaseIntent: false }) }); if (response.ok) { setTitle(""); setContent(""); setWriting(false); await load(); } else setError("게시글을 저장하지 못했습니다."); };
  const react = async (id: string) => { const response = await apiFetch(`/community/${id}/reaction`, { method: "POST" }); if (response.ok) await load(); };
  return <AppShell><section className="page-hero community-hero"><div><p>COMMUNITY</p><h1>함께 사기 전에,<br />먼저 이야기해요.</h1><span>지역 공동구매 경험과 상품 의견을 안전하게 나눕니다.</span></div><div className="community-stats"><StatusBadge type="live">실제 API</StatusBadge><strong>{posts.length}</strong><span>게시글</span></div></section><section className="section-wrap community-layout"><div><div className="section-heading small"><div><p>NEIGHBOR FEED</p><h2>이웃 게시글</h2></div>{session?.user ? <button type="button" className="primary-button" onClick={() => setWriting((value) => !value)}><Plus size={17} /> 글쓰기</button> : <Link className="primary-button" to="/auth">로그인 후 글쓰기</Link>}</div>{writing && <form className="inquiry-form" onSubmit={submit}><label>제목<input value={title} minLength={2} maxLength={120} onChange={(event) => setTitle(event.target.value)} required /></label><label>내용<textarea value={content} minLength={2} maxLength={3000} rows={5} onChange={(event) => setContent(event.target.value)} required /></label><button className="primary-button">등록</button></form>}{error && <div className="order-error">{error}</div>}{loading ? <div className="empty-state">게시글을 불러오는 중입니다.</div> : !posts.length ? <div className="empty-state">아직 게시글이 없습니다.</div> : <div className="post-list">{posts.map((post, index) => <article key={post.id} className="post-card"><div className="post-index">{String(index + 1).padStart(2, "0")}</div><div><div className="post-meta"><span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span></div><h3>{post.title}</h3><p>{post.content}</p><footer><span><MessageCircle size={15} /> {post.community_comments?.[0]?.count ?? 0}</span><button type="button" className="text-button" disabled={!session?.user} onClick={() => void react(post.id)}><Heart size={15} /> {post.community_reactions?.[0]?.count ?? 0}</button></footer></div></article>)}</div>}</div></section></AppShell>;
}
