/**
 * 서비스 공지사항 목록(번호·제목·작성자·작성일 표)과 공지 상세 화면입니다.
 * 별도의 공지 작성 기능은 없고, 운영팀이 코드로 관리하는 고정 목록을 보여줍니다.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { HelpCenterShell } from "@/shared/layout/HelpCenterShell";

type Notice = { id: string; title: string; date: string; pinned?: boolean; views: number; body: string };

// 고정 공지가 먼저, 나머지는 최신순입니다. 상세 화면의 이전글/다음글도 이 순서를 따릅니다.
const NOTICES: Notice[] = [
  {
    id: "toss-payments", pinned: true, date: "2026.08.18", views: 1284,
    title: "[안내] 토스페이먼츠 카드 결제 도입 안내 (2026.08.18~)",
    body: `안녕하세요, 타임딜입니다.

2026년 8월 18일부터 타임딜 주문 시 토스페이먼츠 카드 결제를 이용하실 수 있습니다.

■ 이용 방법
상품 상세 화면에서 픽업 장소와 수령 시간을 고른 뒤, 결제 방법에서 '카드 결제'를 선택해 주세요.
토스페이먼츠 결제창에서 카드사를 선택하면 결제가 완료됩니다.

■ 결제 방법 안내
· 카드 결제: 주문과 동시에 결제가 완료됩니다.
· 현장 결제: 픽업 매장에서 수령할 때 결제합니다.
· 결제 없는 예약: 목표 인원이 모이면 확정 안내를 드립니다.

■ 취소·환불
픽업 전 상태의 주문은 마이페이지 > 주문 내역에서 직접 취소할 수 있으며, 카드 결제 금액은 카드사 영업일 기준 3~5일 안에 환불됩니다.

※ 현재 카드 결제는 테스트 모드로 운영 중이며 실제 금액은 청구되지 않습니다.

감사합니다.`,
  },
  {
    id: "reopen-request", pinned: true, date: "2026.08.10", views: 962,
    title: "[안내] 재오픈 요청 기능 오픈 안내",
    body: `안녕하세요, 타임딜입니다.

아쉽게 놓친 딜을 다시 만날 수 있도록 '재오픈 요청' 기능을 새로 열었습니다.

■ 이렇게 이용하세요
1. 홈 화면의 '이 딜 다시 열어주세요!' 영역이나 마감된 상품 상세 화면에서 '재오픈 요청' 버튼을 눌러 주세요.
2. 요청이 많이 모인 딜은 판매자에게 우선 전달되어 재오픈을 검토합니다.
3. 딜이 다시 열리면 알림으로 가장 먼저 알려 드립니다.

■ 참고해 주세요
· 재오픈 요청은 계정당 딜마다 1번씩 할 수 있으며, 다시 누르면 취소됩니다.
· 재오픈 여부와 가격은 판매자 사정에 따라 달라질 수 있습니다.

많은 이용 부탁드립니다.`,
  },
  {
    id: "seongsu-pickup", date: "2026.07.28", views: 2031,
    title: "[안내] 성수동 지역 픽업 서비스 정식 오픈",
    body: `안녕하세요, 타임딜입니다.

그동안 시범 운영하던 성수동 지역 픽업 서비스를 7월 28일부터 정식으로 시작합니다.

■ 픽업 가능 지역
성수동1가 · 성수동2가 · 서울숲 인근 · 뚝섬역 · 왕십리역 주변

■ 픽업 장소
GS25, CU, 세븐일레븐 등 제휴 편의점과 이마트 성수점, 홈플러스 익스프레스 서울숲점 등 총 24곳에서 수령할 수 있습니다.
가까운 픽업 장소는 '지도찾기' 메뉴에서 확인해 주세요.

■ 픽업 시간
매일 07:00 ~ 22:00 (장소마다 다를 수 있으며, 주문 시 수령 가능한 시간만 선택할 수 있습니다.)

동네 이웃과 함께 더 가까운 곳에서 신선한 상품을 받아 보세요.`,
  },
  {
    id: "privacy-update", date: "2026.07.15", views: 744,
    title: "[안내] 개인정보 처리방침 개정 안내",
    body: `안녕하세요, 타임딜입니다.

타임딜 개인정보 처리방침이 아래와 같이 개정되어 안내드립니다.

■ 시행일
2026년 7월 22일

■ 주요 변경 내용
1. 소셜 로그인(카카오·구글) 이용 시 수집 항목 추가: 닉네임, 프로필 사진(선택), 이메일
2. 픽업 장소 추천을 위한 위치 정보 이용 목적 명시 (위치 정보는 저장하지 않고 동네 설정에만 사용)
3. 결제 대행사(토스페이먼츠) 개인정보 처리 위탁 내용 추가

변경된 전체 내용은 화면 하단의 '개인정보처리방침'에서 확인하실 수 있습니다.
개정 내용에 동의하지 않으시면 마이페이지에서 회원 탈퇴를 요청하실 수 있습니다.

감사합니다.`,
  },
  {
    id: "community-open", date: "2026.07.01", views: 1517,
    title: "[안내] 커뮤니티 기능 오픈 안내",
    body: `안녕하세요, 타임딜입니다.

동네 이웃과 이야기를 나눌 수 있는 '커뮤니티'가 새로 열렸습니다.

■ 커뮤니티에서 할 수 있는 것
· 같이 사요: 혼자 사기 많은 상품을 이웃과 나눠 살 사람을 구해 보세요.
· 후기: 타임딜로 산 상품의 솔직한 후기를 사진과 함께 남겨 주세요.
· 댓글과 '도움돼요'로 이웃과 소통할 수 있습니다.

■ 함께 지켜 주세요
· 작성자 이름은 '이웃**'처럼 가려서 보여 드립니다.
· 연락처나 계좌번호 같은 개인정보는 글에 적지 말아 주세요.
· 광고, 욕설, 거래 사기 의심 글은 신고되면 운영팀 확인 후 숨김 처리됩니다.

이웃과 함께 더 즐거운 타임딜을 만들어 가요!`,
  },
];

function NoticeDetail({ notice }: { notice: Notice }) {
  const index = NOTICES.indexOf(notice);
  const newer = NOTICES[index - 1];
  const older = NOTICES[index + 1];
  return (
    <article>
      <div style={{ borderTop: "2px solid var(--foreground)", borderBottom: "1px solid var(--border)", padding: "18px 4px" }}>
        {notice.pinned && <span className="pin-badge" style={{ marginRight: 8 }}>공지</span>}
        <strong style={{ fontSize: 18 }}>{notice.title}</strong>
        <div style={{ marginTop: 8, color: "var(--muted-foreground)", fontSize: 12 }}>타임딜 · {notice.date} · 조회 {notice.views.toLocaleString("ko-KR")}</div>
      </div>
      <div style={{ padding: "28px 4px 36px", whiteSpace: "pre-wrap", lineHeight: 1.85, fontSize: 14, borderBottom: "1px solid var(--border)" }}>{notice.body}</div>
      <div style={{ fontSize: 13 }}>
        {newer && <Link to={`/notices/${newer.id}`} style={{ display: "flex", gap: 10, padding: "13px 4px", borderBottom: "1px solid var(--border)", color: "inherit", textDecoration: "none" }}><ChevronLeft size={16} /><span style={{ color: "var(--muted-foreground)", minWidth: 44 }}>이전글</span>{newer.title}</Link>}
        {older && <Link to={`/notices/${older.id}`} style={{ display: "flex", gap: 10, padding: "13px 4px", borderBottom: "1px solid var(--border)", color: "inherit", textDecoration: "none" }}><ChevronRight size={16} /><span style={{ color: "var(--muted-foreground)", minWidth: 44 }}>다음글</span>{older.title}</Link>}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}><Link to="/notices" className="secondary-button">목록으로</Link></div>
    </article>
  );
}

export default function NoticePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const selected = id ? NOTICES.find((notice) => notice.id === id) : undefined;
  const regular = NOTICES.filter((notice) => !notice.pinned);
  return (
    <AppShell>
      <HelpCenterShell>
        <div className="help-center-header">
          <h1>공지사항</h1>
          <span>타임딜의 새로운 소식들과 유용한 정보를 한곳에서 확인하세요.</span>
        </div>
        {id ? (
          selected ? <NoticeDetail notice={selected} /> : (
            <div className="empty-state"><h2>공지사항을 찾을 수 없어요.</h2><Link className="secondary-button" to="/notices">목록으로</Link></div>
          )
        ) : (
          <table className="notice-table">
            <thead>
              <tr>
                <th className="col-num">번호</th>
                <th className="col-title">제목</th>
                <th className="col-author">작성자</th>
                <th className="col-date">작성일</th>
              </tr>
            </thead>
            <tbody>
              {NOTICES.map((notice) => (
                <tr key={notice.id} className={notice.pinned ? "pinned" : ""} style={{ cursor: "pointer" }} onClick={() => navigate(`/notices/${notice.id}`)}>
                  <td className="col-num">{notice.pinned ? <span className="pin-badge">공지</span> : regular.length - regular.indexOf(notice)}</td>
                  <td className="col-title"><Link to={`/notices/${notice.id}`} style={{ color: "inherit", textDecoration: "none" }}>{notice.title}</Link></td>
                  <td className="col-author">타임딜</td>
                  <td className="col-date">{notice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HelpCenterShell>
    </AppShell>
  );
}
