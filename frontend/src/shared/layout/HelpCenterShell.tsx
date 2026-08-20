/**
 * 공지사항·FAQ·1:1 문의·대량주문 문의가 공유하는 고객센터 사이드바 레이아웃입니다.
 * 현재 URL(경로 + category 쿼리)을 읽어 사이드바에서 활성 메뉴를 표시합니다.
 */
import { ChevronRight } from "lucide-react";
import { type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const MENU = [
  { label: "공지사항", to: "/notices" },
  { label: "자주하는 질문", to: "/faq" },
  { label: "1:1 문의", to: "/inquiry" },
  { label: "대량 주문 문의", to: "/inquiry?category=bulk" },
] as const;

export function HelpCenterShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isBulkInquiry = location.pathname === "/inquiry" && searchParams.get("category") === "bulk";

  const isActive = (to: string) => {
    if (to === "/inquiry?category=bulk") return isBulkInquiry;
    if (to === "/inquiry") return location.pathname === "/inquiry" && !isBulkInquiry;
    return location.pathname === to;
  };

  return (
    <section className="section-wrap help-center-layout">
      <aside className="help-center-sidebar">
        <h2>고객센터</h2>
        <nav>
          {MENU.map((item) => (
            <button key={item.label} type="button" className={isActive(item.to) ? "active" : ""} onClick={() => navigate(item.to)}>
              <span>{item.label}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="help-center-callout" onClick={() => navigate("/inquiry")}>
          <p>도움이 필요하신가요?</p>
          <span>1:1 문의하기 <ChevronRight size={13} /></span>
        </div>
      </aside>
      <div className="help-center-content">{children}</div>
    </section>
  );
}
