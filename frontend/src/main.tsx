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
import { ensureGuestSession } from "@/lib/auth";
import { installGlobalErrorReporting } from "@/lib/error-reporter";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { toast } from "sonner";

installGlobalErrorReporting();

// Prerender (scripts/prerender.mjs) bakes the home page into #root at build time
// so crawlers see real content. When that markup is present we hydrate it back
// into the normal CSR app; otherwise we do a clean client render.
const rootEl = document.getElementById("root")!;
// 소셜 로그인 결과(#access_token, ?code)는 supabase-js가 곧 URL에서 지우므로 시작하자마자 저장합니다.
const initialHref = window.location.href;

async function bootstrap() {
  try {
    await syncAuthTokenFromUrl();
    // 소셜 로그인 처리를 체험 계정보다 먼저 해야, 로그인 성공 시 체험 계정이 끼어들지 않습니다.
    const oauthResult = await handleSupabaseOAuthCallback(initialHref);
    if (oauthResult.status === "error" || oauthResult.status === "exchange-failed") {
      toast.error(oauthResult.message);
    }
    await ensureGuestSession();
  } catch (error) {
    // 인증 준비가 실패해도 화면은 항상 그립니다(빈 화면 방지).
    console.error("인증 초기화 실패", error);
  }
  if (rootEl.hasChildNodes()) {
    hydrateRoot(rootEl, <ErrorBoundary><App /></ErrorBoundary>);
  } else {
    createRoot(rootEl).render(<ErrorBoundary><App /></ErrorBoundary>);
  }
}

void bootstrap();
