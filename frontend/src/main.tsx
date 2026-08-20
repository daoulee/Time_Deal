/**
 * 브라우저 DOM에 타임딜 React 앱을 시작하는 프론트엔드 진입점입니다.
 * URL 인증 토큰을 먼저 동기화한 뒤 사전 렌더링 마크업은 hydrate하고 일반 실행은 새로 렌더링합니다.
 * SEO용 prerender 결과와 CSR 동작을 모두 보존해야 합니다.
 */
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { syncAuthTokenFromUrl } from "@/lib/api";
import { handleSupabaseOAuthCallback } from "@/lib/oauth-callback";
import { toast } from "sonner";

// Prerender (scripts/prerender.mjs) bakes the home page into #root at build time
// so crawlers see real content. When that markup is present we hydrate it back
// into the normal CSR app; otherwise we do a clean client render.
const rootEl = document.getElementById("root")!;

async function bootstrap() {
  await syncAuthTokenFromUrl();
  const oauthResult = await handleSupabaseOAuthCallback();
  if (oauthResult.status === "error" || oauthResult.status === "exchange-failed") {
    toast.error(oauthResult.message);
  }
  if (rootEl.hasChildNodes()) {
    hydrateRoot(rootEl, <App />);
  } else {
    createRoot(rootEl).render(<App />);
  }
}

void bootstrap();
