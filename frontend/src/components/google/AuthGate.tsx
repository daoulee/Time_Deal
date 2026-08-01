/**
 * 선택적인 Google 인증 초기화 상태에 따라 자식 UI 렌더링을 제어합니다.
 * GoogleLoginButton을 사용하는 인증 화면에서 공개 클라이언트 설정을 확인합니다.
 * 키가 없을 때 앱 전체를 중단하지 않고 해당 기능만 비활성화합니다.
 */
import { GoogleLoginButton } from "./GoogleLoginButton.tsx";
import { useSession } from "../../hooks/useSession.ts";

type AuthGateProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  fallback?: React.ReactNode;
};

/**
 * Built-in template auth gate. Business pages only need to wrap content with AuthGate.
 *
 * Recommended agent usage:
 * ```tsx
 * <AuthGate>
 *   <ShoppingListApp />
 * </AuthGate>
 * ```
 */
export function AuthGate({
  children,
  title = "Sign in to continue",
  description = "Use your Google account to sync and protect your data.",
  fallback
}: AuthGateProps) {
  const { isPending, isAuthenticated } = useSession();

  if (isPending) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="text-sm text-muted-foreground">Checking your sign-in status...</div>
      </main>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <main className="min-h-screen grid place-items-center bg-muted/30 p-6">
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <GoogleLoginButton className="mt-6 w-full" />
      </section>
    </main>
  );
}
