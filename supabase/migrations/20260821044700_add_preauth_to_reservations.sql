-- Migration: 20260821044700_add_preauth_to_reservations.sql
-- Description: 노쇼 방지를 위한 가결제(Hold), 보증금액, 결제수단, 결제상태 컬럼 추가

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'holding',
ADD COLUMN IF NOT EXISTS deposit_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT '신용/체크카드';

-- payment_status: 'holding'(가결제 홀드중) | 'released'(픽업완료로 자동취소) | 'captured'(노쇼 위약금 매입) | 'cancelled'(사용자 예약취소)
COMMENT ON COLUMN reservations.payment_status IS '가결제 상태: holding(가결제 홀드), released(픽업완료/자동취소), captured(노쇼 위약금 청구), cancelled(취소)';
COMMENT ON COLUMN reservations.deposit_amount IS '노쇼 방지 가결제 보증금액 (원)';
COMMENT ON COLUMN reservations.payment_method IS '가결제 수단 (토스페이, 카카오페이, 신용/체크카드)';
