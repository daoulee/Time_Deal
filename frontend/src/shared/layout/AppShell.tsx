/**
 * 고객용 페이지의 공통 헤더·탐색·다크 모드·본문 틀을 제공합니다.
 * Home, Products, Community, Inquiry, MyPage가 같은 서비스 레이아웃을 사용합니다.
 * 인증 상태와 반응형 탐색 동작을 페이지마다 중복 구현하지 않게 합니다.
 */
import { Menu, Moon, Search, ShoppingBag, Sun, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "@/shared/theme/ThemeProvider";

const links = [
  ["/products", "상품"], ["/community", "커뮤니티"], ["/inquiry", "문의사항"], ["/mypage", "마이페이지"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme, mounted } = useTheme();
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <div className="prototype-bar"><span>PROTOTYPE</span> 샘플·Mock 데이터 기반 서비스 화면입니다. 결제와 실시간 기능은 연결 전입니다.</div>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="타임딜 홈"><span className="brand-mark"><ShoppingBag size={19} /></span><strong>타임딜</strong></Link>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }: { isActive: boolean }) => isActive ? "active" : ""}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <Link to="/products" className="icon-button" aria-label="상품 검색"><Search size={19} /></Link>
            <button className="icon-button" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}>{mounted && theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
            <Link to="/auth" className="account-link"><UserRound size={18} /><span>로그인</span></Link>
            <button className="icon-button mobile-menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="모바일 메뉴 열기">{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {open && <nav className="mobile-nav" aria-label="모바일 메뉴">{links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}<Link to="/seller" onClick={() => setOpen(false)}>판매자 데모</Link></nav>}
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer"><div><Link to="/" className="footer-brand">타임딜</Link><p>이웃과 함께 만드는 합리적인 시간 한정 공동구매</p></div><div className="footer-links"><Link to="/seller">판매자 데모</Link><Link to="/admin">관리자</Link><Link to="/inquiry">고객센터</Link></div><p className="footer-note">현재 프로토타입이며 주문·결제·실시간 채팅은 연동 준비 중입니다.</p></footer>
    </div>
  );
}
