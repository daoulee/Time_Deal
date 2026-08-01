/**
 * 타임딜 Hono 앱의 CORS·health·인증 미들웨어와 모든 기능 라우터를 조립합니다.
 * Auth, Products/Deals, MyPage, Inquiry, Community, Seller, Admin 모듈을 기존 `/api` URL에 연결합니다.
 * 허용 Origin과 오류 응답 형식을 변경할 때 프론트 apiFetch 호환성을 유지해야 합니다.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config, isSupabaseConfigured } from "./config.js";
import { apiFailure, apiSuccess } from "./http.js";
import { optionalAuth } from "./middleware/auth.js";
import { adminRouter } from "./modules/Admin/AdminRoutes.js";
import { authRouter } from "./modules/Auth/AuthRoutes.js";
import { communityRouter } from "./modules/Community/CommunityRoutes.js";
import { inquiryRouter } from "./modules/Inquiry/InquiryRoutes.js";
import { myPageRouter } from "./modules/MyPage/MyPageRoutes.js";
import { catalogRouter } from "./modules/Products/ProductsRoutes.js";
import { sellerRouter } from "./modules/Seller/SellerRoutes.js";

const app = new Hono({ strict: false });

app.use("/api/*", cors({
  origin: (origin) => !origin || config.allowedOrigins.includes(origin) ? origin : "",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

app.get("/health", (context) => context.json(apiSuccess({
  status: "ok",
  supabaseConfigured: isSupabaseConfigured(),
  dataMode: isSupabaseConfigured() ? "supabase" : "sample-public-readonly",
})));

app.use("/api/*", optionalAuth);
app.route("/api/auth", authRouter);
app.route("/api", catalogRouter);
app.route("/api", myPageRouter);
app.route("/api", inquiryRouter);
app.route("/api", communityRouter);
app.route("/api", sellerRouter);
app.route("/api", adminRouter);

app.notFound((context) => context.json(apiFailure("NOT_FOUND", "요청한 API를 찾을 수 없습니다."), 404));
app.onError((error, context) => {
  console.error(error);
  return context.json(apiFailure("INTERNAL_ERROR", "서버 오류가 발생했습니다."), 500);
});

export default app;
