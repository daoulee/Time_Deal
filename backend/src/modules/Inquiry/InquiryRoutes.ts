/**
 * 고객 문의 등록·대화와 판매자/관리자 담당 문의 조회·답변·상태 변경 API를 제공합니다.
 * 고객은 본인 문의만, 판매자는 자신에게 배정된 문의만, 관리자는 전체 문의를 처리합니다.
 */
import { Hono } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "../../http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { getAdminSupabase } from "../../supabase.js";
export const inquiryRouter = new Hono();

inquiryRouter.get("/inquiries", requireAuth, async (context) => {
  const { data, error } = await getAdminSupabase().from("inquiries").select("*,inquiry_messages(*)").eq("user_id", context.var.currentUser!.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "문의를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ inquiries: data ?? [] }));
});
inquiryRouter.post("/inquiries", requireAuth, async (context) => {
  const parsed = z.object({ productId: z.string().max(120).optional(), audience: z.enum(["customer", "seller"]), category: z.string().min(1).max(60), subject: z.string().min(2).max(120), message: z.string().min(5).max(3000) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "문의 내용을 확인하세요."), 400);
  const supabase = getAdminSupabase(); let assignedTo: string | null = null;
  if (parsed.data.productId && parsed.data.audience === "seller") { const { data: product } = await supabase.from("products").select("seller_id").eq("id", parsed.data.productId).maybeSingle(); assignedTo = product?.seller_id ?? null; }
  const { data, error } = await supabase.from("inquiries").insert({ user_id: context.var.currentUser!.id, product_id: parsed.data.productId ?? null, audience: parsed.data.audience, category: parsed.data.category, subject: parsed.data.subject, message: parsed.data.message, assigned_to: assignedTo }).select().single();
  if (error) return context.json(apiFailure("SAVE_FAILED", "문의를 저장하지 못했습니다."), 400);
  await supabase.from("inquiry_messages").insert({ inquiry_id: data.id, author_id: context.var.currentUser!.id, message: parsed.data.message });
  return context.json(apiSuccess({ inquiry: data }), 201);
});
inquiryRouter.post("/inquiries/:id/messages", requireAuth, async (context) => {
  const parsed = z.object({ message: z.string().min(1).max(3000) }).strict().safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "답변 내용을 확인하세요."), 400);
  const { data: inquiry } = await getAdminSupabase().from("inquiries").select("id,status").eq("id", context.req.param("id")).eq("user_id", context.var.currentUser!.id).maybeSingle();
  if (!inquiry || inquiry.status === "closed") return context.json(apiFailure("NOT_FOUND", "답변 가능한 문의를 찾을 수 없습니다."), 404);
  const { data, error } = await getAdminSupabase().from("inquiry_messages").insert({ inquiry_id: inquiry.id, author_id: context.var.currentUser!.id, message: parsed.data.message }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "답변을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ message: data }), 201);
});

inquiryRouter.get("/seller/inquiries", requireRole("seller"), async (context) => {
  const { data, error } = await getAdminSupabase().from("inquiries").select("id,product_id,audience,category,subject,status,priority,created_at,updated_at,inquiry_messages(id,author_id,message,created_at)").eq("assigned_to", context.var.currentUser!.id).order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "판매자 문의를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ inquiries: data ?? [] }));
});
inquiryRouter.post("/seller/inquiries/:id/messages", requireRole("seller"), async (context) => {
  const parsed = z.object({ message: z.string().min(1).max(3000) }).strict().safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "답변을 확인하세요."), 400);
  const { data: inquiry } = await getAdminSupabase().from("inquiries").select("id").eq("id", context.req.param("id")).eq("assigned_to", context.var.currentUser!.id).maybeSingle(); if (!inquiry) return context.json(apiFailure("NOT_FOUND", "담당 문의를 찾을 수 없습니다."), 404);
  const { data, error } = await getAdminSupabase().from("inquiry_messages").insert({ inquiry_id: inquiry.id, author_id: context.var.currentUser!.id, message: parsed.data.message }).select().single();
  return error ? context.json(apiFailure("SAVE_FAILED", "답변을 저장하지 못했습니다."), 400) : context.json(apiSuccess({ message: data }), 201);
});
inquiryRouter.get("/admin/inquiries", requireRole("admin"), async (context) => {
  const { data, error } = await getAdminSupabase().from("inquiries").select("*,inquiry_messages(*)").order("created_at", { ascending: false });
  return error ? context.json(apiFailure("QUERY_FAILED", "전체 문의를 조회하지 못했습니다."), 502) : context.json(apiSuccess({ inquiries: data ?? [] }));
});
inquiryRouter.patch("/admin/inquiries/:id", requireRole("admin"), async (context) => {
  const parsed = z.object({ status: z.enum(["open", "in_progress", "answered", "closed"]).optional(), priority: z.enum(["low", "normal", "high", "urgent"]).optional(), assignedTo: z.string().uuid().nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0).safeParse(await context.req.json().catch(() => null)); if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "문의 처리 정보를 확인하세요."), 400);
  const update = { ...(parsed.data.status ? { status: parsed.data.status, closed_at: parsed.data.status === "closed" ? new Date().toISOString() : null } : {}), ...(parsed.data.priority ? { priority: parsed.data.priority } : {}), ...(parsed.data.assignedTo !== undefined ? { assigned_to: parsed.data.assignedTo } : {}), updated_at: new Date().toISOString() };
  const { data, error } = await getAdminSupabase().from("inquiries").update(update).eq("id", context.req.param("id")).select().maybeSingle(); return error || !data ? context.json(apiFailure("SAVE_FAILED", "문의를 변경하지 못했습니다."), 400) : context.json(apiSuccess({ inquiry: data }));
});
inquiryRouter.post("/admin/inquiries/:id/messages", requireRole("admin"), async (context) => {
  const parsed = z.object({ message: z.string().min(1).max(3000), isInternal: z.boolean().default(false) }).strict().safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json(apiFailure("INVALID_INPUT", "답변 내용을 확인하세요."), 400);
  const supabase = getAdminSupabase(); const { data: inquiry } = await supabase.from("inquiries").select("id,status").eq("id", context.req.param("id")).maybeSingle();
  if (!inquiry) return context.json(apiFailure("NOT_FOUND", "문의를 찾을 수 없습니다."), 404);
  const { data, error } = await supabase.from("inquiry_messages").insert({ inquiry_id: inquiry.id, author_id: context.var.currentUser!.id, message: parsed.data.message, is_internal: parsed.data.isInternal }).select().single();
  if (error) return context.json(apiFailure("SAVE_FAILED", "답변을 저장하지 못했습니다."), 400);
  if (!parsed.data.isInternal && inquiry.status !== "closed") await supabase.from("inquiries").update({ status: "answered", updated_at: new Date().toISOString() }).eq("id", inquiry.id);
  return context.json(apiSuccess({ message: data }), 201);
});
