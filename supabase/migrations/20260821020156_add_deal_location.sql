-- 딜(가게)의 실제 위치를 서버에 저장 — 웹/앱이 동일한 Supabase를 봐도
-- "같은 동네" 여부를 판단할 근거가 DB에 없었음 (기존엔 뷰어 GPS 기준으로 클라이언트가 매번 가짜 좌표를 생성했음)
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS store_lat double precision,
  ADD COLUMN IF NOT EXISTS store_lng double precision,
  ADD COLUMN IF NOT EXISTS neighborhood text;

CREATE INDEX IF NOT EXISTS idx_deals_neighborhood ON deals (neighborhood);
