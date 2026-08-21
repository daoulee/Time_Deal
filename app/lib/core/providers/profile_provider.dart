import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../providers/location_provider.dart';
import '../utils/app_logger.dart';

class ProfileProvider extends ChangeNotifier {
  String _name = '김동네';
  int _avatarIndex = 0;
  String? _photoUrl;
  String? _verifiedNeighborhood;
  bool _verifying = false;

  String get name => _name;
  int get avatarIndex => _avatarIndex;
  String? get photoUrl => _photoUrl;
  String? get verifiedNeighborhood => _verifiedNeighborhood;
  bool get verifying => _verifying;

  bool isVerified(String neighborhood) => _verifiedNeighborhood == neighborhood;

  static const _avatarColors = [
    Color(0xFFFF4500),
    Color(0xFF3B82F6),
    Color(0xFF10B981),
    Color(0xFFF59E0B),
    Color(0xFF8B5CF6),
    Color(0xFFEC4899),
  ];

  Color get avatarColor => _avatarColors[_avatarIndex % _avatarColors.length];
  static List<Color> get allAvatarColors => _avatarColors;

  ProfileProvider() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    _name = prefs.getString('profile_name') ?? '김동네';
    _avatarIndex = prefs.getInt('profile_avatar') ?? 0;
    _photoUrl = prefs.getString('profile_photo');
    _verifiedNeighborhood = prefs.getString('profile_verified_neighborhood');
    notifyListeners();
  }

  Future<void> update({required String name, required int avatarIndex}) async {
    _name = name.trim().isEmpty ? '김동네' : name.trim();
    _avatarIndex = avatarIndex;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile_name', _name);
    await prefs.setInt('profile_avatar', _avatarIndex);
  }

  Future<void> uploadPhoto(File file) async {
    final supabase = Supabase.instance.client;
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return; // 비로그인 시 업로드 스킵
    try {
      final ext = file.path.split('.').last.toLowerCase();
      final path = 'profiles/$userId.$ext';
      await supabase.storage.from('deal-images').upload(
            path, file,
            fileOptions: const FileOptions(upsert: true),
          );
      final url = supabase.storage.from('deal-images').getPublicUrl(path);
      _photoUrl = url;
      notifyListeners();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('profile_photo', url);
    } catch (e, st) {
      AppLogger.error('프로필 사진 업로드 실패', e, st);
    }
  }
  // [Claude | 2026-08-21] 수정범위: uploadPhoto() 경로 — DeviceId.value → Auth user.id 전환 + 비로그인 guard (Kiro 요청 Auth 전환 작업 #3)

  // GPS 좌표 → 역지오코딩으로 실제 동 이름 반환
  static Future<String?> dongFromGps(double lat, double lng) =>
      LocationProvider.reverseGeocode(lat, lng);

  // 동네 인증: GPS로 실제 위치의 동 이름을 가져와 인증
  Future<VerifyResult> verifyNeighborhood({
    required double lat,
    required double lng,
  }) async {
    _verifying = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 600)); // UX pause

    final dong = await LocationProvider.reverseGeocode(lat, lng);
    _verifying = false;

    if (dong == null) {
      notifyListeners();
      return VerifyResult.unknownNeighborhood;
    }

    _verifiedNeighborhood = dong;
    notifyListeners();
    await _saveVerified(dong);
    return VerifyResult.success;
  }

  Future<void> _saveVerified(String neighborhood) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile_verified_neighborhood', neighborhood);
  }
}

enum VerifyResult { success, tooFar, unknownNeighborhood }
