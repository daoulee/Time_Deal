/**
 * 고객용 페이지의 공통 상단바·본문 틀을 제공합니다.
 * Home, Products, Community, Inquiry, MyPage가 같은 StoreHeader 디자인을 공유합니다.
 * 인증 상태와 상단 탐색 동작을 페이지마다 중복 구현하지 않게 합니다.
 */
import type { ReactNode } from "react";
import { StoreHeader } from "@/shared/layout/StoreHeader";
import { SiteFooter } from "@/shared/layout/SiteFooter";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <StoreHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
    </div>
  );
}