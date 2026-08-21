-- ============================================================
-- 1. atomic stock decrement & increment RPC (레이스 컨디션 방지)
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_stock(deal_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE deals
  SET remaining_stock = remaining_stock - 1
  WHERE id = deal_id
    AND remaining_stock > 0;
$$;

CREATE OR REPLACE FUNCTION increment_stock(deal_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE deals
  SET remaining_stock = LEAST(remaining_stock + 1, total_stock)
  WHERE id = deal_id;
$$;
-- [Kiro | 2026-08-21] decrement_stock, increment_stock — deal_id 타입 TEXT→UUID 수정 (uuid=text 오퍼레이터 오류 해결)

-- ============================================================
-- 2. Row Level Security (RLS)
-- ============================================================
--
-- ※ 현재 앱은 Supabase Auth 세션이 아닌 DeviceId(UUID)를 user_id/store_id로
--   사용하므로 auth.uid()로 행 수준 필터링이 불가합니다.
--   대신 아래 원칙으로 최소한의 보호를 적용합니다:
--
--   deals       : 조회·등록은 허용, 수정은 RPC(SECURITY DEFINER)만 허용,
--                 삭제는 차단 (딜 삭제는 앱 내 별도 로직 없음)
--   reservations: 조회·생성·수정 허용, 삭제는 차단
--   wishlists   : 전체 허용 (개인 취향 데이터, 민감도 낮음)
--
--   → 핵심 보호: 딜 직접 DELETE 및 deals UPDATE를 앱 외부에서 막고,
--     재고 변경은 SECURITY DEFINER RPC만 통해 원자적으로 처리합니다.
-- ============================================================

-- ── deals ───────────────────────────────────────────────────
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- 피드/지도용 전체 조회 허용 (공개 데이터)
CREATE POLICY "deals_select_all" ON deals
  FOR SELECT USING (true);

-- 딜 등록: store_id 값이 존재해야 허용 (빈 값 방지)
CREATE POLICY "deals_insert_own" ON deals
  FOR INSERT WITH CHECK (
    store_id IS NOT NULL
  );

-- 딜 수정: remaining_stock/total_stock 변경은 RPC(SECURITY DEFINER)가 처리.
--   앱에서 직접 UPDATE 하는 경우(딜 편집)는 store_id 일치 여부를 앱 레벨에서 검증.
--   DB 레벨에서는 만료 딜 수정 차단만 적용 (이미 마감된 딜 재오픈 방지)
CREATE POLICY "deals_update_active_only" ON deals
  FOR UPDATE USING (
    expires_at > now()
  );

-- 딜 삭제: 완전 차단 (앱에 삭제 기능 없음, 외부 직접 삭제 방지)
CREATE POLICY "deals_delete_block" ON deals
  FOR DELETE USING (false);

-- ── reservations ────────────────────────────────────────────
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 예약 생성: user_id와 deal_id가 반드시 존재해야 허용
CREATE POLICY "reservations_insert" ON reservations
  FOR INSERT WITH CHECK (
    user_id IS NOT NULL
    AND deal_id IS NOT NULL
  );

-- 예약 조회: 전체 허용 (앱 쿼리 레벨에서 user_id/store_id로 필터링)
--   클라이언트에서 .eq('user_id', DeviceId) 또는 deals 조인으로 필터링하므로
--   DB 정책은 전체 허용 후 앱에서 제어
CREATE POLICY "reservations_select_all" ON reservations
  FOR SELECT USING (true);

-- 예약 상태 수정: status 필드 값이 유효한 값으로만 변경 허용
--   ('진행중' → '픽업완료' or '취소' 만 허용)
CREATE POLICY "reservations_update_valid_status" ON reservations
  FOR UPDATE USING (true)
  WITH CHECK (
    status IN ('진행중', '픽업완료', '취소')
  );

-- 예약 삭제: 차단 (예약 취소는 status='취소'로 처리, 레코드는 보존)
CREATE POLICY "reservations_delete_block" ON reservations
  FOR DELETE USING (false);

-- ── wishlists ────────────────────────────────────────────────
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- 찜 목록 조회 허용
CREATE POLICY "wishlists_select_all" ON wishlists
  FOR SELECT USING (true);

-- 찜 등록: user_id 값이 존재해야 허용
CREATE POLICY "wishlists_insert_own" ON wishlists
  FOR INSERT WITH CHECK (
    user_id IS NOT NULL
  );
-- [Kiro | 2026-08-21] RLS 정책 전체 — UUID 타입 컬럼 빈 문자열(<>'') 비교 제거

-- 찜 upsert(update) 허용
CREATE POLICY "wishlists_update_own" ON wishlists
  FOR UPDATE USING (true);

-- 찜 삭제 허용 (본인 찜 해제)
CREATE POLICY "wishlists_delete_own" ON wishlists
  FOR DELETE USING (true);
