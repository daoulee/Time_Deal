-- ============================================================
-- 1. atomic stock decrement RPC (레이스 컨디션 방지)
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_stock(deal_id TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE deals
  SET remaining_stock = remaining_stock - 1
  WHERE id = deal_id
    AND remaining_stock > 0;
$$;

-- ============================================================
-- 2. Row Level Security (RLS)
-- ============================================================

-- ── deals ───────────────────────────────────────────────────
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- 피드/지도용 전체 조회 허용
CREATE POLICY "deals_select_all" ON deals
  FOR SELECT USING (true);

-- 딜 등록 허용 (store_id 검증은 앱에서)
CREATE POLICY "deals_insert_own" ON deals
  FOR INSERT WITH CHECK (true);

-- 재고 업데이트: decrement_stock RPC(SECURITY DEFINER)가 처리
CREATE POLICY "deals_update_stock_only" ON deals
  FOR UPDATE USING (true);

-- ── reservations ────────────────────────────────────────────
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 예약 생성 허용
CREATE POLICY "reservations_insert" ON reservations
  FOR INSERT WITH CHECK (true);

-- SELECT를 허용 (접근 제어는 앱 쿼리 레벨에서 처리)
--   소비자: .eq('user_id', DeviceId.value) 필터
--   상인:   deals 테이블을 store_id로 먼저 필터링 후 reservations 조인
CREATE POLICY "reservations_select_all" ON reservations
  FOR SELECT USING (true);

-- 상태 업데이트 허용 (픽업완료 / 취소 처리)
CREATE POLICY "reservations_update_all" ON reservations
  FOR UPDATE USING (true);
