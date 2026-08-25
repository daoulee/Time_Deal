/**
 * 이웃 게시글을 실제 API로 조회하고 검색할 수 있는 커뮤니티 목록 화면입니다.
 * 게시글을 클릭하면 상세 페이지로 이동해 댓글을 보고, 글쓴이 본인이 수정·삭제할 수 있습니다.
 */
import { type FormEvent, useEffect, useState, useMemo } from "react";
import { ImageUp, MessageCircle, Plus, ThumbsUp, X, BellRing, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { StoreHeader } from "@/shared/layout/StoreHeader";
import { SiteFooter } from "@/shared/layout/SiteFooter";
import { authClient } from "@/lib/auth";
import { apiFetch, getCommunityImageUploadUrl, uploadProductImage } from "@/lib/api";

const MAX_IMAGES = 5;
const SUCCESS_STORY_TAG = "[우리가게 이야기]";

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  purchase_intent: boolean;
  image_url?: string | null;
  image_urls?: string[] | null;
  community_comments?: Array<{ count: number }>;
  community_reactions?: Array<{ count: number }>;
}

function postThumbnail(post: Post): string | null {
  if (post.image_urls?.length) return post.image_urls[0];
  return post.image_url ?? null;
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── 검색 상태 ──
  const [searchQuery, setSearchQuery] = useState("");
  const [storyOnly, setStoryOnly] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const load = async () => {
    setLoading(true);
    const response = await apiFetch("/community?limit=30", { auth: false });
    const body = (await response.json().catch(() => null)) as { data?: { posts?: Post[] } } | null;
    if (response.ok) {
      setPosts(body?.data?.posts ?? []);
    } else {
      setError("게시글을 불러오지 못했습니다.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // ── 검색·성공스토리 필터링된 게시글 목록 ──
  const filteredPosts = useMemo(() => {
    let list = posts;
    if (storyOnly) list = list.filter((p) => p.title.startsWith(SUCCESS_STORY_TAG));
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    return list;
  }, [posts, searchQuery, storyOnly]);

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - imageFiles.length;
    const picked = Array.from(files).slice(0, Math.max(0, remaining));
    if (!picked.length) return;
    setImageFiles((prev) => [...prev, ...picked]);
    setImagePreviews((prev) => [...prev, ...picked.map((file) => URL.createObjectURL(file))]);
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index); });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setTitle(""); setContent(""); setImageFiles([]); setImagePreviews([]); setWriting(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setUploading(true);

    const uploadedPaths: string[] = [];
    for (const file of imageFiles) {
      const signed = await getCommunityImageUploadUrl(file);
      if (!signed.ok || !signed.data) {
        setUploading(false);
        setError(signed.error?.message ?? "이미지 업로드 URL을 만들지 못했습니다.");
        return;
      }
      const uploaded = await uploadProductImage(signed.data.bucket, signed.data.objectPath, signed.data.token, file);
      if (!uploaded.ok) {
        setUploading(false);
        setError(uploaded.error ?? "이미지 업로드에 실패했습니다.");
        return;
      }
      uploadedPaths.push(signed.data.objectPath);
    }

    const response = await apiFetch("/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, purchaseIntent: false, images: uploadedPaths }),
    });
    setUploading(false);

    if (response.ok) {
      resetForm();
      await load();
      showToast("게시글이 성공적으로 등록되었습니다!");
    } else {
      setError("게시글을 저장하지 못했습니다.");
    }
  };

  const react = async (id: string) => {
    const response = await apiFetch(`/community/${id}/reaction`, { method: "POST" });
    if (response.ok) await load();
  };

  return (
    <div style={{ width: "100%", background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── 토스트 알림 ── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 40,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(26, 26, 26, 0.95)",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: 30,
            fontSize: 14,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
          }}
        >
          <BellRing size={16} color="#ff5722" />
          <span>{toastMessage}</span>
        </div>
      )}

      <StoreHeader />

      <main style={{ width: "100%", maxWidth: "1050px", margin: "0 auto", padding: "0 16px 80px", boxSizing: "border-box", flex: 1 }}>
        {/* 상단 히어로 섹션 */}
        <section style={{ margin: "40px 0 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ color: "#ff5722", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>COMMUNITY</p>
            <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, margin: "0 0 12px 0" }}>
              함께 사기 전에,<br />먼저 이야기해요.
            </h1>
            <span style={{ fontSize: "15px", color: "#666666" }}>지역 공동구매 경험과 상품 의견을 안전하게 나눕니다.</span>
          </div>
        </section>

        {/* 게시글 목록 및 작성 섹션 */}
        <section style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", paddingBottom: "12px", borderBottom: "2px solid #1a1a1a" }}>
            <div>
              <p style={{ fontSize: "12px", color: "#888888", margin: "0 0 4px 0", fontWeight: 600 }}>NEIGHBOR FEED</p>
              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>이웃 게시글</h2>
            </div>
            {session?.user ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { if (writing) resetForm(); else { setWriting(true); setTitle(`${SUCCESS_STORY_TAG} `); } }}
                  style={{ background: "#ffffff", border: "1px solid #ff5722", color: "#ff5722", padding: "10px 18px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  우리가게 이야기 쓰기
                </button>
                <button
                  type="button"
                  onClick={() => { if (writing) resetForm(); else setWriting(true); }}
                  style={{ background: "#ff5722", border: "none", color: "#ffffff", padding: "10px 18px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Plus size={17} /> {writing ? "취소" : "글쓰기"}
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                style={{ background: "#ff5722", color: "#ffffff", padding: "10px 18px", textDecoration: "none", fontWeight: 600, display: "inline-block" }}
              >
                로그인 후 글쓰기
              </Link>
            )}
          </div>

          {/* ── 전체/성공스토리 필터 탭 ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => setStoryOnly(false)}
              style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${!storyOnly ? "#ff5722" : "#cbd5e1"}`, background: !storyOnly ? "#fff5f2" : "#ffffff", color: !storyOnly ? "#ff5722" : "#666", fontWeight: !storyOnly ? 700 : 500, fontSize: 13, cursor: "pointer" }}
            >
              전체 게시글
            </button>
            <button
              type="button"
              onClick={() => setStoryOnly(true)}
              style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${storyOnly ? "#ff5722" : "#cbd5e1"}`, background: storyOnly ? "#fff5f2" : "#ffffff", color: storyOnly ? "#ff5722" : "#666", fontWeight: storyOnly ? 700 : 500, fontSize: 13, cursor: "pointer" }}
            >
              🏪 우리가게 이야기
            </button>
          </div>

          {/* ── 게시글 제목 검색창 ── */}
          <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", border: "1px solid #cbd5e1", background: "#ffffff", padding: "0 14px", height: "42px", maxWidth: "360px" }}>
            <Search size={18} color="#888" style={{ marginRight: "8px" }} />
            <input
              type="text"
              placeholder="게시글 제목을 검색하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", border: "none", outline: "none", fontSize: "14px", color: "#333" }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* 글쓰기 폼 */}
          {writing && (
            <form onSubmit={submit} style={{ border: "1px solid #e2e8f0", padding: "24px", background: "#f8f9fa", marginBottom: "32px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px", fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                제목
                <input
                  value={title}
                  minLength={2}
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  style={{ padding: "10px 12px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", background: "#ffffff" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px", fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                내용
                <textarea
                  value={content}
                  minLength={2}
                  maxLength={3000}
                  rows={5}
                  onChange={(event) => setContent(event.target.value)}
                  required
                  style={{ padding: "10px 12px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", resize: "vertical", background: "#ffffff" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px", fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                사진 (최대 {MAX_IMAGES}장, {imageFiles.length}/{MAX_IMAGES})
                {imagePreviews.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {imagePreviews.map((url, index) => (
                      <div key={url} style={{ position: "relative", width: "80px", height: "80px" }}>
                        <img src={url} alt="미리보기" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeImage(index)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageFiles.length < MAX_IMAGES && (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#e2e8f0", color: "#333", fontSize: "13px", fontWeight: 500, cursor: "pointer", width: "fit-content" }}>
                    <ImageUp size={15} /> 사진 첨부
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addImages(event.target.files); event.target.value = ""; }} style={{ display: "none" }} />
                  </label>
                )}
              </label>
              <button
                type="submit"
                disabled={uploading}
                style={{ background: "#ff5722", border: "none", color: "#ffffff", padding: "10px 24px", fontWeight: 600, cursor: "pointer" }}
              >
                {uploading ? "등록 중..." : "등록하기"}
              </button>
            </form>
          )}

          {error && <div style={{ padding: "12px", background: "#fff5f5", color: "#e53935", border: "1px solid #ffcdd2", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}

          {/* ── 검색 결과에 따른 1열 리스트 표시 ── */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#888888" }}>게시글을 불러오는 중입니다.</div>
          ) : !filteredPosts.length ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#888888" }}>
              {searchQuery ? "검색 결과가 없습니다." : "아직 게시글이 없습니다."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredPosts.map((post) => {
                const thumbnail = postThumbnail(post);
                return (
                  <article
                    key={post.id}
                    onClick={() => navigate(`/community/${post.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "28px 0",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                    }}
                  >
                    {/* 좌측: 작성자 정보 */}
                    <div style={{ width: "160px", flexShrink: 0, paddingRight: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>이웃**</span>
                      </div>
                    </div>

                    {/* 우측: 본문 내용 및 인터랙션 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 10px 0", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 8 }}>
                        {post.title.startsWith(SUCCESS_STORY_TAG) && (
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#ff5722", background: "#fff5f2", border: "1px solid #ffccbc", borderRadius: 12, padding: "2px 8px", flexShrink: 0 }}>
                            🏪 우리가게 이야기
                          </span>
                        )}
                        <span>{post.title.startsWith(SUCCESS_STORY_TAG) ? post.title.slice(SUCCESS_STORY_TAG.length).trim() : post.title}</span>
                      </h3>

                      <p style={{ fontSize: "14px", color: "#333333", margin: "0 0 16px 0", lineHeight: 1.6, whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {post.content}
                      </p>

                      {thumbnail && (
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                          <img src={thumbnail} alt="첨부 이미지" style={{ width: "120px", height: "120px", objectFit: "cover", border: "1px solid #e2e8f0" }} />
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                        <span style={{ fontSize: "12px", color: "#999999" }}>
                          {new Date(post.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "")}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#666666", fontSize: "13px" }}>
                            <MessageCircle size={15} /> 댓글 {post.community_comments?.[0]?.count ?? 0}
                          </span>

                          <button
                            type="button"
                            disabled={!session?.user}
                            onClick={(event) => { event.stopPropagation(); void react(post.id); }}
                            style={{
                              background: "none",
                              border: "1px solid #d9d9d9",
                              padding: "6px 14px",
                              borderRadius: 18,
                              color: "#333333",
                              cursor: session?.user ? "pointer" : "default",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            <ThumbsUp size={13} color={post.community_reactions?.[0]?.count ? "#ff5722" : "#666"} />
                            도움돼요 {post.community_reactions?.[0]?.count ?? 0}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
