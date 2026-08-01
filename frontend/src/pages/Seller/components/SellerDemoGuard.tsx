/**
 * 판매자 데모 화면 진입 조건과 안내 상태를 처리하는 기능 전용 가드입니다.
 * App.tsx의 `/seller/*` 경로에서 SellerPage를 감싸 사용합니다.
 * 실제 seller 역할 보안은 백엔드 Seller 모듈에서 반드시 다시 검증합니다.
 */
import type { ReactNode } from "react";

/** 판매자 role 스키마 연결 전에도 데모 화면임을 명확히 고지하는 임시 가드입니다. */
export function SellerDemoGuard({ children }: { children: ReactNode }) {
  return <div data-seller-access="demo" aria-label="판매자 권한 데모 화면">{children}</div>;
}
