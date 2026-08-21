import 'dart:math';

class GeoUtils {
  static double haversine(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371.0;
    final dLat = _rad(lat2 - lat1);
    final dLng = _rad(lng2 - lng1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_rad(lat1)) * cos(_rad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
    return r * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  static double _rad(double deg) => deg * pi / 180;

  /// 기준 좌표에서 distKm만큼 bearingDeg 방향으로 이동한 좌표
  static ({double lat, double lng}) offsetPoint(
      double lat, double lng, double distKm, double bearingDeg) {
    const r = 6371.0;
    final d = distKm / r;
    final b = _rad(bearingDeg);
    final lat1 = _rad(lat);
    final lng1 = _rad(lng);
    final lat2 = asin(sin(lat1) * cos(d) + cos(lat1) * sin(d) * cos(b));
    final lng2 = lng1 +
        atan2(sin(b) * sin(d) * cos(lat1), cos(d) - sin(lat1) * sin(lat2));
    return (lat: lat2 * 180 / pi, lng: lng2 * 180 / pi);
  }
}
// [Claude | 2026-08-21] 수정범위: GeoUtils.offsetPoint() 신규 — post_login_setup_screen에 있던 중복 로직을 공용 유틸로 추출 (근처 동네 자동 감지 재사용)
