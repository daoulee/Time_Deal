/**
 * 전시·시연용 데모 데이터를 채웁니다.
 *  1) 진행 중(active) 딜의 마감을 지금부터 약 1년 뒤로 늘립니다(딜마다 0~30일씩 엇갈리게).
 *  2) 커뮤니티에 동네 이웃 계정 6개와 게시글·댓글·좋아요를 만듭니다(실제 상품 사진·이름 사용).
 *  3) 커뮤니티에 남아 있는 테스트 글("테스트")을 숨김 처리합니다(삭제 아님, status='hidden').
 *
 * 기본은 미리보기이며 --apply 를 붙여야 실제로 씁니다. 여러 번 실행해도 글이 중복되지 않습니다.
 *   node --env-file=.env scripts/seed-demo.mjs           # 미리보기
 *   node --env-file=.env scripts/seed-demo.mjs --apply   # 적용
 */
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
// 실행할 때마다 값이 바뀌지 않도록 id 기반의 고정 난수를 씁니다.
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
const log = (...a) => console.log(APPLY ? "[적용]" : "[미리보기]", ...a);
const must = ({ data, error }, what) => { if (error) throw new Error(`${what}: ${error.message}`); return data; };

// ── 1) 딜 마감 1년 연장 ─────────────────────────────────────────
const deals = must(await sb.from("deals").select("id,ends_at").eq("status", "active"), "딜 조회");
log(`진행 중 딜 ${deals.length}개 → 마감을 약 1년 뒤로`);
for (const d of deals) {
  const r = hash(d.id);
  const startsAt = now - (2 + Math.floor(r * 70)) * HOUR;          // 2~72시간 전에 시작한 것처럼
  const endsAt = now + 365 * DAY + Math.floor(hash(d.id + "e") * 30) * DAY + Math.floor(r * 24) * HOUR;
  if (APPLY) must(await sb.from("deals").update({ starts_at: iso(startsAt), ends_at: iso(endsAt), updated_at: iso(now) }).eq("id", d.id), `딜 ${d.id} 수정`);
}
if (deals[0]) log(`예: ${deals[0].id} 마감 ${iso(now + 365 * DAY).slice(0, 10)} 전후`);

// ── 2) 동네 이웃 데모 계정 ───────────────────────────────────────
const NEIGHBORS = [
  ["seongsu-bread", "성수동빵순이"],
  ["seoulforest-walk", "서울숲산책러"],
  ["ttukseom-runner", "뚝섬러너"],
  ["wangsimni-solo", "왕십리자취생"],
  ["seongsu2-local", "성수2가토박이"],
  ["yeonmujang-worker", "연무장길직장인"],
  // '우리가게 이야기'를 쓰는 동네 가게 사장님들
  ["owner-bakery", "성수베이커리사장"],
  ["owner-sundae", "30년순대집"],
  ["owner-salad", "뚝섬샐러드랩"],
  ["owner-hambak", "성수함박키친"],
  ["owner-fruit", "서울숲청과"],
];
const emailOf = (key) => `demo-${key}@timedeal-demo.example`;
const listed = must(await sb.auth.admin.listUsers({ perPage: 1000 }), "사용자 목록").users;
const userIdByKey = {};
for (const [key, name] of NEIGHBORS) {
  let user = listed.find((u) => u.email === emailOf(key));
  if (!user && APPLY) {
    user = must(await sb.auth.admin.createUser({ email: emailOf(key), password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true, user_metadata: { name } }), `계정 ${key}`).user;
  }
  if (user) {
    userIdByKey[key] = user.id;
    if (APPLY) must(await sb.from("profiles").upsert({ id: user.id, name, role: "user" }), `프로필 ${key}`);
  }
  log(`이웃 계정 ${name} ${user ? "준비됨" : "(생성 예정)"}`);
}

// ── 3) 게시글·댓글·좋아요 ────────────────────────────────────────
const productImage = {};
for (const p of must(await sb.from("products").select("id,image").in("id", ["2", "5", "4", "8", "1", "7", "9", "3", "6"]), "상품 사진")) productImage[p.id] = p.image;

// [작성자, 며칠 전, 몇 시, 제목, 본문, 같이 사요?, 사진 상품 id, 댓글[[작성자, 내용]], 좋아요 수]
const POSTS = [
  ["seongsu-bread", 0, 8, "소금빵 4개 세트 나눠 사실 분 계신가요?", "버터 소금빵 4개 세트가 7,900원인데 혼자 4개는 많아서요 😅\n2개씩 나누실 분 계시면 내일 아침 8시쯤 성수역 3번 출구 앞 GS25에서 같이 픽업해요!", true, "5",
    [["wangsimni-solo", "저요! 저도 혼자라 2개면 딱이에요. 내일 8시 가능합니다"], ["seongsu-bread", "좋아요! 그럼 제가 예약하고 채팅 드릴게요 🙌"]], 9],
  ["seoulforest-walk", 0, 13, "딸기 진짜 달아요 (후기)", "어제 타임딜로 산 논산 딸기 2팩 후기 남겨요.\n크기도 고르고 무른 거 하나도 없었어요. 서울숲 산책하면서 한 팩 다 먹었네요 🍓\n아직 타임딜 진행 중이니 고민 중이신 분들 추천드려요.", false, "2",
    [["seongsu2-local", "오 저도 장바구니에 넣어놨는데 바로 예약해야겠네요"], ["ttukseom-runner", "작년에 비해 가격도 괜찮은 것 같아요"], ["seoulforest-walk", "네 픽업 매장도 가까워서 편했어요!"]], 14],
  ["wangsimni-solo", 1, 19, "계란 30구 반판씩 나누실 분", "특란 30구가 9,900원인데 1인 가구라 30개는 유통기한 안에 다 못 먹어요 ㅠ\n15구씩 나눌 분 구해요. 왕십리역 근처면 더 좋아요!", true, "4",
    [["yeonmujang-worker", "저 회사가 연무장길인데 퇴근길에 가능해요. 몇 시쯤 생각하세요?"], ["wangsimni-solo", "7시 반쯤 어떠세요? 계란판은 제가 챙겨갈게요"], ["yeonmujang-worker", "좋습니다 👍"]], 7],
  ["ttukseom-runner", 1, 7, "달리기 후 샐러드 팩 가성비 최고", "뚝섬 한 바퀴 돌고 닭가슴살 샐러드 팩 픽업했는데 4,900원에 양도 넉넉해요.\n소스도 두 종류라 안 질려요. 운동하시는 분들 아침 픽업 추천!", false, "6",
    [["seoulforest-walk", "아침 픽업 몇 시부터 되나요?"], ["ttukseom-runner", "7시부터 돼요! 출근 전에 들르기 딱이에요"]], 11],
  ["yeonmujang-worker", 2, 12, "점심에 함박스테이크 픽업했어요", "회사 근처라 점심시간에 바로 픽업했는데 아직 따뜻했어요.\n구운 채소도 같이 있어서 한 끼로 충분합니다. 동료들이랑 3개 같이 예약했어요 😋", false, "1",
    [["seongsu-bread", "사진 보니까 배고파지네요..."], ["seongsu2-local", "여기 가게 원래 줄 서는 집인데 타임딜로 사니까 좋네요"]], 16],
  ["seongsu2-local", 2, 18, "30년 전통 순대집 타임딜 떴어요!", "동네 30년 된 순대집이 타임딜에 올라왔네요. 어릴 때부터 먹던 집인데 이 가격이면 정말 싸요.\n모둠으로 사서 반 나누실 분 있으면 댓글 주세요~", true, "7",
    [["wangsimni-solo", "헉 거기 저도 단골이에요. 반 나눠요!"], ["ttukseom-runner", "저도 끼워주세요 ㅎㅎ"], ["seongsu2-local", "세 명이면 딱이네요. 내일 오후에 픽업해요!"]], 21],
  ["seongsu-bread", 3, 10, "더치커피 1+1 나눔 구해요", "스페셜티 더치 원액 500ml 1+1인데 두 병은 너무 많아서 한 병 가져가실 분 찾아요.\n성수 카페거리 쪽에서 드릴 수 있어요 ☕", true, "8",
    [["yeonmujang-worker", "커피 좋아하는데 저 가져가도 될까요?"], ["seongsu-bread", "네! 반값만 주시면 돼요"]], 6],
  ["seoulforest-walk", 4, 16, "방울토마토 유기농 맞네요", "유기농 방울토마토 500g 샀는데 껍질 얇고 새콤달콤해요.\n아이 간식으로 좋아서 다음 타임딜도 알림 설정해뒀어요.", false, "9",
    [["seongsu2-local", "애들 간식으로 딱이죠. 저도 알림 걸어둘게요"]], 8],
  ["wangsimni-solo", 5, 21, "화장지 32롤 반 나눔 하실 분?", "자취방에 32롤 둘 데가 없어서요 ㅋㅋ 16롤씩 나누실 분 구합니다.\n주말에 왕십리역 CU에서 픽업 예정이에요.", true, "3",
    [["ttukseom-runner", "저 16롤 할게요! 토요일 오후 괜찮으세요?"], ["wangsimni-solo", "네 토요일 3시에 봬요 🙂"]], 5],
  ["yeonmujang-worker", 6, 9, "타임딜 처음 써봤는데 생각보다 편하네요", "회사 동료 추천으로 처음 써봤어요. 퇴근길에 편의점에서 바로 픽업하니까 배송 기다릴 필요가 없네요.\n마감 시간이 보여서 오늘 뭐 살지 고르기도 쉽고요. 앞으로 자주 쓸 것 같아요!", false, null,
    [["seongsu-bread", "환영해요! 동네 사람들끼리 나눠 사면 더 싸요 😊"], ["seoulforest-walk", "커뮤니티에서 같이 살 사람 구하면 꿀이에요"]], 12],
  // ── 우리가게 이야기 (사장님이 직접 쓰는 글, 제목 앞 태그로 구분) ──
  ["owner-bakery", 0, 15, "[우리가게 이야기] 매일 남던 소금빵, 이제 저녁 7시면 다 나가요", "성수동에서 6년째 빵을 굽고 있는 작은 베이커리입니다.\n예전엔 마감 때마다 소금빵이 20개씩 남아서 버리거나 직원들이 나눠 가졌는데, 타임딜에 4개 세트로 올리고 나서는 저녁 7시면 다 나가요.\n아침 7시 반 GS25 픽업으로 받아 가시는 단골분들도 생겼어요. 늘 감사드립니다 🥐", false, "5",
    [["seongsu-bread", "사장님 소금빵 진짜 맛있어요! 버터 향이 달라요"], ["wangsimni-solo", "출근길 픽업 너무 편해요. 오래오래 해주세요"], ["owner-bakery", "감사합니다! 다음 주엔 바게트도 올려볼게요 😊"]], 18],
  ["owner-sundae", 1, 11, "[우리가게 이야기] 30년 순대집이 앱을 시작한 이유", "어머니가 1994년에 시작한 순대집을 이어받아 운영하고 있습니다.\n솔직히 앱은 어려워서 미뤘는데, 아들이 등록을 도와줘서 시작했어요. 오후에 남는 모둠 순대를 타임딜로 올리니 젊은 손님들이 많이 찾아오시네요.\n커뮤니티에서 반씩 나눠 사신다는 글 보고 많이 웃었습니다. 양은 넉넉히 담아 드릴게요!", false, "7",
    [["seongsu2-local", "어릴 때부터 먹던 집이에요. 사장님 건강하세요!"], ["ttukseom-runner", "지난주에 사 갔는데 간도 같이 챙겨주셔서 감동이었어요"]], 24],
  ["owner-salad", 2, 9, "[우리가게 이야기] 아침 7시 픽업을 시작했어요", "뚝섬역 앞에서 샐러드 가게를 하고 있어요.\n러닝하시는 분들이 '아침에도 받을 수 있으면 좋겠다'고 하셔서 이번 달부터 아침 7시 픽업을 열었습니다.\n전날 저녁에 만든 재료는 쓰지 않고 그날 아침에 손질한 채소만 넣어요. 소스는 오리엔탈·발사믹 중 고르실 수 있어요 🥗", false, "6",
    [["ttukseom-runner", "저 때문인가요 ㅎㅎ 감사합니다! 내일 아침에 갈게요"], ["seoulforest-walk", "아침 픽업 너무 좋네요"]], 13],
  ["owner-hambak", 3, 14, "[우리가게 이야기] 점심 장사 끝나고 남는 함박, 이렇게 해결했어요", "성수 연무장길에서 함박스테이크 가게를 합니다.\n점심 피크가 지나면 미리 구워 둔 패티가 남는 날이 많았는데, 마감 2시간 전부터 자동 할인으로 올리니까 근처 직장인분들이 퇴근길에 많이 가져가세요.\n버리는 음식이 줄어서 마음이 제일 편해졌어요.", false, "1",
    [["yeonmujang-worker", "퇴근길에 자주 가져가요! 구운 채소가 맛있어요"], ["owner-bakery", "같은 동네 사장님 반가워요 🙌 저희도 버리는 게 줄었어요"]], 15],
  ["owner-fruit", 4, 17, "[우리가게 이야기] 못난이 딸기도 맛은 똑같아요", "서울숲 앞 작은 과일가게입니다.\n모양이 조금 고르지 않거나 크기가 작은 딸기는 상품 진열이 어려워서 늘 고민이었어요. 타임딜로 2팩씩 묶어 올렸더니 '맛은 똑같다'는 후기가 많이 달려서 힘이 납니다.\n논산 농가에서 바로 받아오니 당도는 자신 있어요 🍓", false, "2",
    [["seoulforest-walk", "제가 후기 쓴 그 딸기네요! 정말 달았어요"], ["seongsu2-local", "과일은 여기서만 사요"]], 19],
];

const authorIds = Object.values(userIdByKey);
const existing = authorIds.length ? must(await sb.from("community_posts").select("id,title").in("user_id", authorIds), "기존 데모 글") : [];
let created = 0;
for (const [author, daysAgo, hour, title, content, purchaseIntent, imageProduct, comments, likes] of POSTS) {
  if (existing.some((p) => p.title === title)) { log(`이미 있음: ${title}`); continue; }
  const kst = new Date(now - daysAgo * DAY); kst.setUTCHours(hour - 9, Math.floor(hash(title) * 59), 0, 0);
  const createdAt = Math.min(kst.getTime(), now - 20 * 60 * 1000);
  log(`글 작성: [${purchaseIntent ? "같이 사요" : "후기"}] ${title} (댓글 ${comments.length}, 좋아요 ${likes})`);
  created++;
  if (!APPLY) continue;
  const post = must(await sb.from("community_posts").insert({
    user_id: userIdByKey[author], title, content, purchase_intent: purchaseIntent, status: "visible", visibility: "public",
    image_url: imageProduct ? productImage[imageProduct] ?? null : null, created_at: iso(createdAt), updated_at: iso(createdAt),
  }).select("id").single(), `글 ${title}`);
  for (const [i, [who, text]] of comments.entries()) {
    const at = createdAt + (i + 1) * (25 + Math.floor(hash(text) * 90)) * 60 * 1000;
    must(await sb.from("community_comments").insert({ post_id: post.id, user_id: userIdByKey[who], content: text, created_at: iso(Math.min(at, now - 60 * 1000)), updated_at: iso(Math.min(at, now - 60 * 1000)) }), "댓글");
  }
  // 좋아요는 계정당 1개라, 데모 이웃 + 기존 일반 사용자 계정으로 채웁니다.
  const likers = [...authorIds.filter((id) => id !== userIdByKey[author])];
  if (likes > likers.length) {
    const extra = must(await sb.from("profiles").select("id").neq("role", "admin").limit(60), "좋아요 계정");
    for (const p of extra) if (!likers.includes(p.id)) likers.push(p.id);
  }
  const rows = likers.slice(0, likes).map((user_id) => ({ post_id: post.id, user_id, reaction: "like" }));
  if (rows.length) must(await sb.from("community_reactions").upsert(rows, { onConflict: "post_id,user_id", ignoreDuplicates: true }), "좋아요");
}
log(`새 글 ${created}개`);

// ── 4) 남은 테스트 글 숨김 ───────────────────────────────────────
const junk = must(await sb.from("community_posts").select("id,title").eq("status", "visible").in("title", ["테스트", "test", "ㅇㅁ"]), "테스트 글");
for (const p of junk) {
  log(`테스트 글 숨김: "${p.title}" (${p.id})`);
  if (APPLY) must(await sb.from("community_posts").update({ status: "hidden" }).eq("id", p.id), "테스트 글 숨김");
}
if (!APPLY) console.log("\n미리보기였습니다. 실제로 적용하려면 --apply 를 붙여 다시 실행하세요.");
