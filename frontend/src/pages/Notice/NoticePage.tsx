/**
 * 서비스 공지사항을 번호·제목·작성자·작성일 표 형식으로 보여주는 정적 안내 페이지입니다.
 * 별도의 공지 작성 기능은 없고, 운영팀이 코드로 관리하는 고정 목록을 보여줍니다.
 */
import { AppShell } from "@/shared/layout/AppShell";
import { HelpCenterShell } from "@/shared/layout/HelpCenterShell";

const PINNED_NOTICES = [
  { title: "[안내] 토스페이먼츠 카드 결제 도입 안내 (2026.08.18~)", date: "2026.08.18" },
  { title: "[안내] 재오픈 요청 기능 오픈 안내", date: "2026.08.10" },
];

const NOTICES = [
  { title: "[안내] 성수동 지역 픽업 서비스 정식 오픈", date: "2026.07.28" },
  { title: "[안내] 개인정보 처리방침 개정 안내", date: "2026.07.15" },
  { title: "[안내] 커뮤니티 기능 오픈 안내", date: "2026.07.01" },
];

export default function NoticePage() {
  return (
    <AppShell>
      <HelpCenterShell>
        <div className="help-center-header">
          <h1>공지사항</h1>
          <span>타임딜의 새로운 소식들과 유용한 정보를 한곳에서 확인하세요.</span>
        </div>
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
            {PINNED_NOTICES.map((notice) => (
              <tr key={notice.title} className="pinned">
                <td className="col-num"><span className="pin-badge">공지</span></td>
                <td className="col-title">{notice.title}</td>
                <td className="col-author">타임딜</td>
                <td className="col-date">{notice.date}</td>
              </tr>
            ))}
            {NOTICES.map((notice, index) => (
              <tr key={notice.title}>
                <td className="col-num">{NOTICES.length - index}</td>
                <td className="col-title">{notice.title}</td>
                <td className="col-author">타임딜</td>
                <td className="col-date">{notice.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </HelpCenterShell>
    </AppShell>
  );
}
