-- 2026-08-20 새로 만든 테이블(payments/reopen_requests/경매 5종)에 service_role 등 기본 권한이
-- 자동으로 부여되지 않는 문제를 해결합니다. 지금 존재하는 테이블에 권한을 주고,
-- 앞으로 새로 만드는 테이블에도 자동으로 같은 권한이 붙도록 기본 권한을 설정합니다.
grant usage on schema public to service_role, authenticated, anon;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all on sequences to service_role;
