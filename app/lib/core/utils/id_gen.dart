import 'dart:math';

/// RFC 4122 v4 UUID 생성 — Postgres uuid 컬럼과 호환되는 id가 필요한 곳에서 사용
String generateUuidV4() {
  final rng = Random.secure();
  final bytes = List.generate(16, (_) => rng.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
      '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}
// [Claude | 2026-08-21] 수정범위: generateUuidV4() 신규 — device_id.dart의 중복 로직을 공용 유틸로 추출, deal_create_screen의 uuid 미스매치 버그 수정에 재사용
