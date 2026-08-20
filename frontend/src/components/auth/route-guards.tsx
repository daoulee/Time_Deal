/**
 * 로그인이 필요한 고객 화면을 보호하고 세션 로딩·리다이렉트를 처리합니다.
 * App.tsx의 `/mypage/*` 경로와 공통 인증 흐름에서 사용합니다.
 * 백엔드 권한 검사를 대체하지 않으며 UI 접근 경계만 제공합니다.
 */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authClient } from "@/lib/auth";

type AuthRouteGuardProps = {
  children: ReactNode;
  requireVerifiedEmail?: boolean;
  redirectTo?: string;
};

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export function RequireAuth({
  children,
  requireVerifiedEmail = false,
  redirectTo = "/auth",
}: AuthRouteGuardProps) {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <AuthLoading />;
  }

  if (!session?.user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (requireVerifiedEmail && !session.user.emailVerified) {
    return <Navigate to={redirectTo} replace state={{ from: location, reason: "verify_email" }} />;
  }

  return <>{children}</>;
}

export function RequireVerifiedEmail({ children, redirectTo = "/auth" }: AuthRouteGuardProps) {
  return (
    <RequireAuth requireVerifiedEmail redirectTo={redirectTo}>
      {children}
    </RequireAuth>
  );
}
