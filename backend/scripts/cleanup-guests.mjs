/**
 * 체험 모드(GUEST_MODE)로 만들어진 임시 계정(guest-*@guest.example.com)을 정리합니다.
 * 기본은 미리보기(dry-run)이며, 실제 삭제는 --apply 를 붙여야 합니다.
 *   node --env-file=.env scripts/cleanup-guests.mjs           # 몇 개인지만 확인
 *   node --env-file=.env scripts/cleanup-guests.mjs --apply   # 실제 삭제
 * 체험 계정이 등록한 상품·딜·주문은 계정 삭제 시 FK 설정에 따라 함께 지워지거나 남을 수 있으니,
 * 삭제 전에 미리보기 결과와 DB 상태를 확인하세요.
 */
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const guests = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  guests.push(...data.users.filter((user) => user.email?.endsWith("@guest.example.com")));
  if (data.users.length < 200) break;
}
console.log(`체험 계정 ${guests.length}개 발견${apply ? " — 삭제 시작" : " (미리보기, 삭제하려면 --apply)"}`);
if (apply) {
  let deleted = 0;
  for (const user of guests) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) console.warn(`삭제 실패 ${user.id}: ${error.message}`); else deleted += 1;
  }
  console.log(`${deleted}개 삭제 완료`);
}
