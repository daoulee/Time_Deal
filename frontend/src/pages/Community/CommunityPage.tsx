/**
 * 이웃 간 상품 질문·구매 의견을 조회하고 나누는 커뮤니티 화면입니다.
 * 백엔드 Community 모듈의 게시글 조회·작성 API와 연결될 페이지입니다.
 * 샘플 게시글과 실시간 기능 준비 상태를 구분해 표시합니다.
 */
import { MessageCircle, Plus, UsersRound } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { StatusBadge } from "@/shared/components/StatusBadge";

const posts = [
  ["계란 타임딜 픽업 시간 같이 맞춰요", "토요일 오전 픽업 가능한 분 계신가요? 참여 후 일정을 함께 정하면 좋을 것 같아요.", "김타임", "댓글 5"],
  ["생활용품 딜 중 어떤 구성이 실용적일까요?", "세제 세트와 화장지 중 다음 딜로 원하는 상품에 의견 남겨주세요.", "박딜", "댓글 8"],
  ["논산 딸기 보관 팁 공유합니다", "받은 날 바로 씻기보다 꼭지를 둔 채 냉장 보관하는 편이 오래갑니다.", "이웃상점", "댓글 3"],
];
export default function CommunityPage() { return <AppShell><section className="page-hero community-hero"><div><p>COMMUNITY</p><h1>함께 사기 전에,<br />먼저 이야기해요.</h1><span>게시글과 댓글은 샘플이며 실시간 업데이트와 알림은 연동 전입니다.</span></div><div className="community-stats"><StatusBadge type="mock" /><strong>3</strong><span>샘플 게시글</span></div></section><section className="section-wrap community-layout"><div><div className="section-heading small"><div><p>NEIGHBOR FEED</p><h2>이웃 게시글</h2></div><button type="button" className="primary-button" disabled><Plus size={17} /> 글쓰기 준비 중</button></div><div className="post-list">{posts.map(([title, body, author, comments], index) => <article key={title} className="post-card"><div className="post-index">0{index + 1}</div><div><div className="post-meta"><span>{author}</span><span>샘플</span></div><h3>{title}</h3><p>{body}</p><footer><span><MessageCircle size={15} /> {comments}</span><span>방금 전</span></footer></div></article>)}</div></div><aside className="community-room"><div className="room-header"><UsersRound size={22} /><div><strong>계란 공동구매방</strong><span>참여자 15명 · Mock</span></div></div><div className="room-messages"><p><b>김타임</b><span>주말 오전 픽업 가능한가요?</span></p><p className="seller-message"><b>판매자 데모</b><span>수령 일정 기능을 연결할 예정입니다.</span></p><p><b>이딜</b><span>토요일 오전에 저도 가능해요.</span></p></div><div className="room-input"><input aria-label="채팅 메시지" placeholder="실시간 채팅 연동 준비 중" disabled /><button disabled>전송</button></div></aside></section></AppShell>; }
