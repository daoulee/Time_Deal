-- Kiro 요청: reservations UPDATE 시 status가 유효한 값으로만 바뀌도록 WITH CHECK 추가
DROP POLICY IF EXISTS "reservations_update_valid_status" ON reservations;
CREATE POLICY "reservations_update_valid_status" ON reservations
  FOR UPDATE USING (true)
  WITH CHECK (
    status IN ('진행중', '픽업완료', '취소', '노쇼')
  );
