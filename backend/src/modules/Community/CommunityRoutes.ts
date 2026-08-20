/**
 * 공개 커뮤니티 게시글 조회와 인증 사용자의 게시글·댓글·좋아요·신고 CRUD를 제공합니다.
 * 작성자 소유권과 soft delete를 적용하며 관리자 moderation은 Admin 모듈에서 처리합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { config } from "../../config.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";
import { notifyUser } from "../../notify.js";
export const communityRouter = new Hono();
const imagePath = z.string().min(3).max(500).regex(/^[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/i);
const imageRef = z.union([imagePath, z.string().url().max(2000)]);
const publicImageUrl = (objectPath: string) => getAdminSupabase().storage.from(config.productImageBucket).getPublicUrl(objectPath).data.publicUrl;
const resolveImageRef = (ref: string) => (ref.startsWith("http://") || ref.startsWith("https://") ? ref : publicImageUrl(ref));
const postInput = z.object({ title: z.string().min(2).max(120), content: z.string().min(2).max(3000), purchaseIntent: z.boolean().default(false), images: z.array(imageRef).max(5, "사진은 최대 5장까지 첨부할 수 있습니다.").optional() }).strict();
const commentInput = z.object({ content: z.string().min(1).max(2000) }).strict();
const imageUploadRequest = z.object({ fileName: z.string().min(1).max(120).regex(/\.(?:jpe?g|png|webp)$/i), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(config.maxImageBytes) }).strict();

communityRouter.get("/community", async (context) => {
  const page = Math.max(1, Number(context.req.query("page") ?? 1)); const limit = Math.min(50, Math.max(1, Number(context.req.query("limit") ?? 20)));
  const { data, error, count } = await getAdminSupabase().from("community_posts").select("*,community_comments(count),community_reactions(count)", { count: "exact" }).eq("status", "visible").eq("visibility", "public").is("deleted_at", null).order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  return error ? context.json(apiFailure("QUERY_FAILED", "게시글을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ posts: data ?? [], page, limit, total: count ?? 0 }));
});
communityRouter.get("/community/:id", async (context) => {
  const { data, error } = await getAdminSupabase().from("community_posts").select("*,community_comments(count),community_reactions(count)").eq("id", context.req.param("id")).eq("status", "visible").is("deleted_at", null).maybeSingle();
  return error || !data ? context.json(apiFailure("NOT_FOUND", "게시글을 찾을 수 없습니다."), 404) : context.json(apiSuccess({ post: data }));
});
communityRouter.get("/community/:id/comments", async (context) => {
  const { data, error } = await getAdminSupabase().from("community_comments").select("*,profiles(name)").eq("post_id", context.req.param("id")).eq("status", "visible").order("created_at", { ascending: true });
  return error ? context.json(apiFailure("QUERY_FAILED", "댓글을 조회하지 못했습니다."), 502) : context.json(apiSuccess({ comments: data ?? [] }));
});
communityRouter.post("/community", requireAuth, async (context) => {
  const parsed = postInput.safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "게시글을 확인하세요."), 400);
  const imageUrls = (parsed.data.images ?? []).map(resolveImageRef);
  const { data, error } = await getAdminSupabase().from("community_posts").insert({ user_id: context.var.currentUser!.id, title: parsed.data.title, content: parsed.data.content, purchase_intent: parsed.data.purchaseIntent, image_url: imageUrls[0] ?? null, image_urls: imageUrls }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "게시글을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ post: data }), 201);
});
communityRouter.patch("/community/:id", requireAuth, async (context) => {
  const parsed = postInput.partial().refine((value) => Object.keys(value).length > 0).safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "수정 내용을 확인하세요."), 400);
  const patchedImageUrls = parsed.data.images !== undefined ? parsed.data.images.map(resolveImageRef) : undefined;
  const update = { ...(parsed.data.title ? { title: parsed.data.title } : {}), ...(parsed.data.content ? { content: parsed.data.content } : {}), ...(parsed.data.purchaseIntent !== undefined ? { purchase_intent: parsed.data.purchaseIntent } : {}), ...(patchedImageUrls !== undefined ? { image_url: patchedImageUrls[0] ?? null, image_urls: patchedImageUrls } : {}), updated_at: new Date().toISOString() };
  const { data } = await getAdminSupabase().from("community_posts").update(update).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).is("deleted_at", null).select().maybeSingle();
  return data ? context.json(apiSuccess({ post: data })) : context.json(apiFailure("NOT_FOUND", "수정할 게시글을 찾을 수 없습니다."), 404);
});
communityRouter.post("/community/image-upload-url", requireAuth, async (context) => {
  const parsed = imageUploadRequest.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_IMAGE", "JPG·PNG·WEBP 이미지만 제한 크기 내에서 업로드할 수 있습니다."), 400);
  const objectPath = `community/${context.var.currentUser!.id}/${crypto.randomUUID()}-${parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { data, error } = await getAdminSupabase().storage.from(config.productImageBucket).createSignedUploadUrl(objectPath);
  return error ? context.json(apiFailure("UPLOAD_URL_FAILED", "이미지 업로드 URL을 만들지 못했습니다."), 502) : context.json(apiSuccess({ bucket: config.productImageBucket, objectPath, signedUrl: data.signedUrl, token: data.token }));
});
communityRouter.delete("/community/:id", requireAuth, async (context) => {
  const { data } = await getAdminSupabase().from("community_posts").update({ status: "deleted", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).select("id").maybeSingle();
  return data ? context.json(apiSuccess({ deleted: true })) : context.json(apiFailure("NOT_FOUND", "삭제할 게시글을 찾을 수 없습니다."), 404);
});
communityRouter.post("/community/:id/comments", requireAuth, async (context) => {
  const parsed = commentInput.safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "댓글을 확인하세요."), 400);
  const postId = context.req.param("id"); const commenterId = context.var.currentUser!.id;
  const { data, error } = await getAdminSupabase().from("community_comments").insert({ post_id: postId, user_id: commenterId, content: parsed.data.content }).select().single();
  if (!error) {
    const { data: post } = await getAdminSupabase().from("community_posts").select("user_id,title").eq("id", postId).maybeSingle();
    if (post && post.user_id !== commenterId) void notifyUser(post.user_id, "community_comment", `[${post.title}] 글에 새 댓글이 달렸어요`, parsed.data.content, `/community/${postId}`);
  }
  return error ? context.json(apiFailure("SAVE_FAILED", "댓글을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ comment: data }), 201);
});
communityRouter.patch("/community/comments/:id", requireAuth, async (context) => {
  const parsed = commentInput.safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "댓글을 확인하세요."), 400);
  const { data } = await getAdminSupabase().from("community_comments").update({ content: parsed.data.content, updated_at: new Date().toISOString() }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).eq("status", "visible").select().maybeSingle();
  return data ? context.json(apiSuccess({ comment: data })) : context.json(apiFailure("NOT_FOUND", "댓글을 찾을 수 없습니다."), 404);
});
communityRouter.delete("/community/comments/:id", requireAuth, async (context) => {
  const { data } = await getAdminSupabase().from("community_comments").update({ status: "deleted", content: "삭제된 댓글입니다." }).eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).select("id").maybeSingle();
  return data ? context.json(apiSuccess({ deleted: true })) : context.json(apiFailure("NOT_FOUND", "댓글을 찾을 수 없습니다."), 404);
});
communityRouter.post("/community/:id/reaction", requireAuth, async (context) => {
  const supabase = getAdminSupabase(); const key = { post_id: context.req.param("id"), user_id: context.var.currentUser!.id };
  const { data: existing } = await supabase.from("community_reactions").select("post_id").match(key).maybeSingle();
  if (existing) { await supabase.from("community_reactions").delete().match(key); return context.json(apiSuccess({ reacted: false })); }
  const { error } = await supabase.from("community_reactions").insert({ ...key, reaction: "like" }); return error ? context.json(apiFailure("SAVE_FAILED", "반응을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ reacted: true }), 201);
});
communityRouter.post("/community/reports", requireAuth, async (context) => {
  const parsed = z.object({ postId: z.string().uuid().optional(), commentId: z.string().uuid().optional(), reason: z.string().min(2).max(500) }).strict().refine((value) => Boolean(value.postId) !== Boolean(value.commentId)).safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "신고 대상을 하나만 선택하세요."), 400);
  const { data, error } = await getAdminSupabase().from("community_reports").insert({ post_id: parsed.data.postId ?? null, comment_id: parsed.data.commentId ?? null, reporter_id: context.var.currentUser!.id, reason: parsed.data.reason }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "신고를 접수하지 못했습니다."), 400) : context.json(apiSuccess({ report: data }), 201);
});
