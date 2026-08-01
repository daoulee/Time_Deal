/**
 * Render·로컬 실행의 PORT, CORS, Supabase URL·키를 환경변수에서 읽습니다.
 * app과 Supabase 클라이언트가 공통으로 소비하며 연결 여부도 이곳에서 판단합니다.
 * 실제 자격증명은 코드에 넣지 않고 서버 환경에서만 주입합니다.
 */
const read = (name: string) => process.env[name]?.trim() ?? "";
export const config = { nodeEnv: read("NODE_ENV") || "development", port: Number(read("PORT") || 10000), allowedOrigins: (read("ALLOWED_ORIGINS") || "http://localhost:3100").split(",").map(v=>v.trim()).filter(Boolean), supabaseUrl: read("SUPABASE_URL"), supabaseAnonKey: read("SUPABASE_ANON_KEY"), supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"), publicBackendUrl: read("PUBLIC_BACKEND_URL") };
export const isSupabaseConfigured = () => Boolean(config.supabaseUrl && config.supabaseAnonKey && config.supabaseServiceRoleKey);
