import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';

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

  static String get value => _id ?? 'unknown';

  static String _generate() {
    final rng = Random.secure();
    final bytes = List.generate(16, (_) => rng.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }
}
