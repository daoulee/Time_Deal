-- deals_all / res_all / wl_all 은 USING(true)로 모든 명령을 허용하는 블랭킷 정책이라
-- deals_delete_block, deals_update_active_only 등 이미 존재하는 세밀한 보호 정책을 전부 무력화시킴.
-- (직접 확인: anon key만으로 deals_delete_block이 있는데도 딜 삭제가 성공했음)
-- 웹팀에 anon key를 공유하기 전에 제거 — 세밀한 정책들은 이미 앱의 실제 동작을 모두 커버하므로
-- 이 블랭킷 정책을 지워도 앱 기능은 그대로 동작함.
DROP POLICY IF EXISTS deals_all ON deals;
DROP POLICY IF EXISTS res_all ON reservations;
DROP POLICY IF EXISTS wl_all ON wishlists;
