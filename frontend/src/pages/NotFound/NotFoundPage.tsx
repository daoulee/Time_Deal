/**
 * 등록되지 않은 프론트 경로에 접근했을 때 안내와 복귀 링크를 보여주는 404 화면입니다.
 * App.tsx의 마지막 catch-all 라우트가 이 페이지를 렌더링합니다.
 * 정상 라우트보다 먼저 매칭되지 않도록 라우팅 순서를 유지합니다.
 */
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";

export default function NotFoundPage() { return <AppShell><div className="not-found"><span>404</span><h1>이 페이지의 타임딜은 종료됐어요.</h1><p>주소를 다시 확인하거나 진행 중인 상품으로 이동해 주세요.</p><div><Link className="primary-button" to="/">홈으로</Link><Link className="secondary-button" to="/products">상품 보기</Link></div></div></AppShell>; }
