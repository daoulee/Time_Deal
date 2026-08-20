/**
 * 타임딜 Hono 앱의 보안·CORS·health/readiness·인증 미들웨어와 기능 라우터를 조립합니다.
 * 미완성 네이버 인증 라우트는 노출하지 않고 사용자가 별도 연동할 환경설정 지점만 보존합니다.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config, isSupabaseConfigured } from "./config.js";
import { apiFailure, apiSuccess } from "./http.js";
import { optionalAuth } from "./middleware/auth.js";
import { requestSecurity } from "./middleware/security.js";
import { adminRouter } from "./modules/Admin/AdminRoutes.js";
import { authRouter } from "./modules/Auth/AuthRoutes.js";
import { communityRouter } from "./modules/Community/CommunityRoutes.js";
import { inquiryRouter } from "./modules/Inquiry/InquiryRoutes.js";
import { emailOtpRouter } from "./modules/Auth/EmailOtpRoutes.js";
import { supabaseSessionRouter } from "./modules/Auth/SupabaseSessionRoutes.js";
import { myPageRouter } from "./modules/MyPage/MyPageRoutes.js";
import { catalogRouter } from "./modules/Products/ProductsRoutes.js";
import { sellerRouter } from "./modules/Seller/SellerRoutes.js";
import { ordersRouter } from "./modules/Orders/OrdersRoutes.js";
import { getAdminSupabase } from "./supabase.js";

const app = new Hono({ strict: false });
app.use("*", requestSecurity);
app.use("/api/*", cors({
  origin: (origin) => !origin || config.allowedOrigins.includes(origin) ? origin : "",
  allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length", "X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  maxAge: 86400,
}));

app.get("/health", (context) => context.json(apiSuccess({ status: "ok", supabaseConfigured: isSupabaseConfigured(), dataMode: isSupabaseConfigured() ? "supabase" : config.enableSampleData ? "sample-public-readonly" : "unconfigured" })));
app.get("/ready", async (context) => {
  if (!isSupabaseConfigured()) return context.json(apiFailure("NOT_READY", "필수 Supabase 환경변수가 설정되지 않았습니다."), 503);
  const { error } = await getAdminSupabase().from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  return error ? context.json(apiFailure("NOT_READY", "Supabase 연결을 확인할 수 없습니다."), 503) : context.json(apiSuccess({ status: "ready", paymentModes: ["on_site", "reservation_only"], naverAuth: "external-setup-required" }));
});

app.use("/api/*", optionalAuth);
app.route("/api/auth", authRouter);
app.route("/api/auth/email-otp", emailOtpRouter);
app.route("/api/auth/supabase-session", supabaseSessionRouter);
app.route("/api", catalogRouter);
app.route("/api", myPageRouter);
app.route("/api", inquiryRouter);
app.route("/api", communityRouter);
app.route("/api", sellerRouter);
app.route("/api", adminRouter);
app.route("/api", ordersRouter);
app.notFound((context) => context.json(apiFailure("NOT_FOUND", "요청한 API를 찾을 수 없습니다."), 404));
app.onError((error, context) => { console.error(JSON.stringify({ level: "error", requestId: context.res.headers.get("x-request-id"), message: error.message })); return context.json(apiFailure("INTERNAL_ERROR", "서버 오류가 발생했습니다."), 500); });
export default app;
