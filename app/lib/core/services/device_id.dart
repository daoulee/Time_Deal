import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/id_gen.dart';

class DeviceId {
  static String? _id;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _id = prefs.getString('device_id');
    if (_id == null) {
      _id = _generate();
      await prefs.setString('device_id', _id!);
    }
  }

  /// Supabase Auth 로그인 세션이 있으면 auth.currentUser.id 사용, 없으면 디바이스 UUID fallback
  static String get value {
    try {
      final authUserId = Supabase.instance.client.auth.currentUser?.id;
      if (authUserId != null && authUserId.isNotEmpty) return authUserId;
    } catch (_) {}
    return _id ?? 'unknown';
  }

  /// 기기 고유 UUID
  static String get rawDeviceId => _id ?? 'unknown';

  static String _generate() => generateUuidV4();
}
// [Claude | 2026-08-21] 수정범위: DeviceId._generate() — 중복 UUID 로직을 id_gen.dart의 generateUuidV4()로 위임
