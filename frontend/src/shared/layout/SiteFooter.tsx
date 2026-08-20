/**
 * 고객용 페이지 하단에 공통으로 쓰는 푸터입니다. AppShell과 독립 페이지(StoreHeader 사용처)가 함께 씁니다.
 */
import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="footer-brand"><img src="/images/deal-logo.png" alt="타임딜" /></Link>
        <p>이웃과 함께 만드는 합리적인 시간 한정 공동구매</p>
      </div>
      <div className="footer-links">
        <Link to="/seller">판매자 센터</Link>
        <Link to="/admin">관리자 콘솔</Link>
        <Link to="/inquiry">고객센터</Link>
      </div>
      <p className="footer-note">카드 결제(토스페이먼츠 테스트 모드), 현장 결제, 결제 없는 예약 중 선택해 주문할 수 있습니다.</p>
    </footer>
  );
}
