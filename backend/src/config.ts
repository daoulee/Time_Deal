/**
 * Render·로컬 실행의 포트, CORS, Supabase, 샘플 데이터, OAuth 연결 지점 환경변수를 읽습니다.
 * 실제 자격증명은 코드에 넣지 않고 서버 환경에만 주입하며 운영 모드의 샘플 자동 폴백은 기본 차단합니다.
 */
const read = (name: string): string => process.env[name]?.trim() ?? "";
const parseList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);
const nodeEnv = read("NODE_ENV") || "development";
const allowedOrigins = parseList(read("ALLOWED_ORIGINS") || "http://localhost:3100");

export const config = {
  nodeEnv,
  port: Number(read("PORT") || 10000),
  allowedOrigins,
  authRedirectOrigins: parseList(read("AUTH_REDIRECT_ORIGINS") || allowedOrigins.join(",")),
  supabaseUrl: read("SUPABASE_URL"),
  supabaseAnonKey: read("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  publicBackendUrl: read("PUBLIC_BACKEND_URL"),
  enableSampleData: read("ENABLE_SAMPLE_DATA") === "true" && nodeEnv !== "production",
  productImageBucket: read("PRODUCT_IMAGE_BUCKET") || "product-images",
  maxImageBytes: Number(read("MAX_IMAGE_BYTES") || 5_242_880),
  naverClientId: read("NAVER_CLIENT_ID"),
  naverClientSecret: read("NAVER_CLIENT_SECRET"),
  naverRedirectUri: read("NAVER_REDIRECT_URI"),
  paymentProvider: read("PAYMENT_PROVIDER") || "not_configured",
} as const;

export const isSupabaseConfigured = (): boolean => Boolean(config.supabaseUrl && config.supabaseAnonKey && config.supabaseServiceRoleKey);
export const isAllowedRedirectOrigin = (origin: string): boolean => config.authRedirectOrigins.includes(origin);
export const passwordResetRedirect = (): string => `${config.authRedirectOrigins[0] ?? "http://localhost:3100"}/auth/reset-password`;
