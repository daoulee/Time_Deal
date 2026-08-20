/**
 * 커뮤니티 게시글 하나를 열어 댓글을 보고 남길 수 있는 상세 화면입니다.
 * 글쓴이 본인에게만 수정·삭제 버튼이 보입니다.
 */
import { type FormEvent, useEffect, useState } from "react";
import { ImageUp, MessageCircle, Pencil, Send, ThumbsUp, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StoreHeader } from "@/shared/layout/StoreHeader";
import { SiteFooter } from "@/shared/layout/SiteFooter";
import { authClient } from "@/lib/auth";
import { apiFetch, getCommunityImageUploadUrl, uploadProductImage } from "@/lib/api";

const MAX_IMAGES = 5;

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles?: { name?: string } | null;
}

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  community_comments?: Array<{ count: number }>;
  community_reactions?: Array<{ count: number }>;
}

function postImages(post: Post): string[] {
  if (post.image_urls?.length) return post.image_urls;
  return post.image_url ? [post.image_url] : [];
}

export default function CommunityPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [postResponse, commentsResponse] = await Promise.all([
      apiFetch(`/community/${id}`, { auth: false }),
      apiFetch(`/community/${id}/comments`, { auth: false }),
    ]);
    const postBody = (await postResponse.json().catch(() => null)) as { data?: { post?: Post } } | null;
    const commentsBody = (await commentsResponse.json().catch(() => null)) as { data?: { comments?: Comment[] } } | null;
    if (postResponse.ok && postBody?.data?.post) {
      setPost(postBody.data.post);
    } else {
      setError("게시글을 찾을 수 없습니다.");
    }
    if (commentsResponse.ok) setComments(commentsBody?.data?.comments ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEdit = () => {
    if (!post) return;
    setTitle(post.title);
    setContent(post.content);
    setExistingImages(postImages(post));
    setImageFiles([]);
    setImagePreviews([]);
    setEditing(true);
    setError("");
  };

  const cancelEdit = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    setEditing(false);
  };

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - existingImages.length - imageFiles.length;
    const picked = Array.from(files).slice(0, Math.max(0, remaining));
    if (!picked.length) return;
    setImageFiles((prev) => [...prev, ...picked]);
    setImagePreviews((prev) => [...prev, ...picked.map((file) => URL.createObjectURL(file))]);
  };

  const removeNewImage = (index: number) => {
    setImagePreviews((prev) => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index); });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!post) return;
    setError("");
    setSaving(true);

    const uploadedPaths: string[] = [];
    for (const file of imageFiles) {
      const signed = await getCommunityImageUploadUrl(file);
      if (!signed.ok || !signed.data) {
        setSaving(false);
        setError(signed.error?.message ?? "이미지 업로드 URL을 만들지 못했습니다.");
        return;
      }
      const uploaded = await uploadProductImage(signed.data.bucket, signed.data.objectPath, signed.data.token, file);
      if (!uploaded.ok) {
        setSaving(false);
        setError(uploaded.error ?? "이미지 업로드에 실패했습니다.");
        return;
      }
      uploadedPaths.push(signed.data.objectPath);
    }

    const response = await apiFetch(`/community/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, images: [...existingImages, ...uploadedPaths] }),
    });
    setSaving(false);

    if (response.ok) {
      cancelEdit();
      await load();
    } else {
      setError("게시글을 수정하지 못했습니다.");
    }
  };

  const removePost = async () => {
    if (!post) return;
    if (!window.confirm("게시글을 삭제할까요?")) return;
    setDeleting(true);
    const response = await apiFetch(`/community/${post.id}`, { method: "DELETE" });
    setDeleting(false);
    if (response.ok) {
      navigate("/community");
    } else {
      setError("게시글을 삭제하지 못했습니다.");
    }
  };

  const react = async () => {
    if (!post) return;
    const response = await apiFetch(`/community/${post.id}/reaction`, { method: "POST" });
    if (response.ok) await load();
  };

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || !post) return;
    setCommentSubmitting(true);
    const response = await apiFetch(`/community/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setCommentSubmitting(false);
    if (response.ok) {
      setCommentText("");
      await load();
    } else {
      setError("댓글을 등록하지 못했습니다.");
    }
  };

  const isOwner = Boolean(post && session?.user?.id === post.user_id);
  const totalImageCount = existingImages.length + imageFiles.length;

  return (
    <div style={{ width: "100%", background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreHeader />

      <main style={{ width: "100%", maxWidth: "1050px", margin: "0 auto", padding: "40px 16px 80px", boxSizing: "border-box", flex: 1 }}>
        <Link to="/community" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "inline-block", marginBottom: "20px" }}>
          ← 목록으로
        </Link>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888888" }}>불러오는 중입니다.</div>
        ) : !post ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888888" }}>{error || "게시글을 찾을 수 없습니다."}</div>
        ) : editing ? (
          <form onSubmit={saveEdit} style={{ border: "1px solid #e2e8f0", padding: "24px", background: "#f8f9fa" }}>
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
                rows={6}
                onChange={(event) => setContent(event.target.value)}
                required
                style={{ padding: "10px 12px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", resize: "vertical", background: "#ffffff" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px", fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
              사진 (최대 {MAX_IMAGES}장, {totalImageCount}/{MAX_IMAGES})
              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {existingImages.map((url, index) => (
                    <div key={`existing-${url}`} style={{ position: "relative", width: "80px", height: "80px" }}>
                      <img src={url} alt="첨부 이미지" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button type="button" onClick={() => removeExistingImage(index)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((url, index) => (
                    <div key={`new-${url}`} style={{ position: "relative", width: "80px", height: "80px" }}>
                      <img src={url} alt="미리보기" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button type="button" onClick={() => removeNewImage(index)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {totalImageCount < MAX_IMAGES && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#e2e8f0", color: "#333", fontSize: "13px", fontWeight: 500, cursor: "pointer", width: "fit-content" }}>
                  <ImageUp size={15} /> 사진 첨부
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addImages(event.target.files); event.target.value = ""; }} style={{ display: "none" }} />
                </label>
              )}
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" disabled={saving} style={{ background: "#ff5722", border: "none", color: "#ffffff", padding: "10px 24px", fontWeight: 600, cursor: "pointer" }}>
                {saving ? "저장 중..." : "수정 완료"}
              </button>
              <button type="button" onClick={cancelEdit} style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#333", padding: "10px 24px", fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0, lineHeight: 1.4 }}>{post.title}</h1>
              {isOwner && (
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button type="button" onClick={startEdit} style={{ background: "none", border: "1px solid #d9d9d9", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#666" }}>
                    <Pencil size={13} /> 수정
                  </button>
                  <button type="button" disabled={deleting} onClick={() => void removePost()} style={{ background: "none", border: "1px solid #d9d9d9", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#e53935" }}>
                    <Trash2 size={13} /> 삭제
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}>
              이웃** ·{" "}
              {new Date(post.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "")}
            </div>

            <p style={{ fontSize: "15px", color: "#333333", margin: "0 0 20px 0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{post.content}</p>

            {postImages(post).length > 0 && (
              <div
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  display: "grid",
                  gridTemplateColumns: postImages(post).length === 1 ? "1fr" : "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "8px",
                  marginBottom: "24px",
                }}
              >
                {postImages(post).map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="첨부 이미지"
                    style={{
                      width: "100%",
                      aspectRatio: postImages(post).length === 1 ? "16 / 9" : "1 / 1",
                      objectFit: "cover",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={!session?.user}
              onClick={() => void react()}
              style={{
                background: "none",
                border: "1px solid #d9d9d9",
                padding: "8px 16px",
                borderRadius: 18,
                color: "#333333",
                cursor: session?.user ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "32px",
              }}
            >
              <ThumbsUp size={14} color={post.community_reactions?.[0]?.count ? "#ff5722" : "#666"} />
              도움돼요 {post.community_reactions?.[0]?.count ?? 0}
            </button>

            <section style={{ borderTop: "2px solid #1a1a1a", paddingTop: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageCircle size={16} /> 댓글 {comments.length}
              </h2>

              {error && <div style={{ padding: "12px", background: "#fff5f5", color: "#e53935", border: "1px solid #ffcdd2", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}

              {comments.length === 0 ? (
                <div style={{ fontSize: "13px", color: "#888", padding: "10px 0" }}>첫 번째 댓글을 남겨보세요!</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  {comments.map((comment) => (
                    <div key={comment.id} style={{ fontSize: "13px", borderBottom: "1px solid #edf2f7", paddingBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: "#333" }}>{comment.profiles?.name ?? "이웃주민"}</span>
                        <span style={{ fontSize: "11px", color: "#aaa" }}>{new Date(comment.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                      <p style={{ margin: 0, color: "#444" }}>{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {session?.user ? (
                <form onSubmit={submitComment} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="댓글을 남겨주세요..."
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff", outline: "none" }}
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting}
                    style={{ background: "#ff5722", border: "none", color: "#fff", padding: "0 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              ) : (
                <div style={{ fontSize: "13px", color: "#888", textAlign: "center", padding: "8px 0" }}>
                  댓글을 작성하려면 <Link to="/auth" style={{ color: "#ff5722", fontWeight: 600 }}>로그인</Link>이 필요합니다.
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
