import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/mock_data.dart';
import '../utils/app_logger.dart';

class LocationProvider extends ChangeNotifier {
  static const _key = 'neighborhood';
  static const _radiusKey = 'search_radius_km';

  String _neighborhood = '성수동 2가';
  int _radiusKm = 3;
  Position? _position;
  String? locationError;

  String get neighborhood => _neighborhood;
  int get radiusKm => _radiusKm;
  Position? get position => _position;

  ({double lat, double lng}) get mapCenter {
    final pos = _position;
    if (pos != null) return (lat: pos.latitude, lng: pos.longitude);
    return neighborhoodCoords[_neighborhood] ?? dealCenter;
  }

  LocationProvider() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved != null && saved != _neighborhood) {
      _neighborhood = saved;
    }
    final savedRadius = prefs.getInt(_radiusKey);
    if (savedRadius != null) {
      _radiusKm = savedRadius;
    }
    notifyListeners();
  }

  Future<void> setNeighborhood(String name) async {
    _neighborhood = name;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, name);
  }

  Future<void> setRadiusKm(int r) async {
    _radiusKm = r;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_radiusKey, r);
  }

  Future<void> requestLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          locationError = '위치 권한이 거부됐어요';
          notifyListeners();
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        locationError = '위치 권한이 영구 거부됐어요. 설정에서 변경해주세요';
        notifyListeners();
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      _position = pos;

      // GPS → 실제 행정동 이름 역지오코딩
      final dong = await reverseGeocode(pos.latitude, pos.longitude);
      if (dong != null) {
        _neighborhood = dong;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_key, dong);
      }

      notifyListeners();
    } catch (e, st) {
      AppLogger.error('Failed to get location', e, st);
      locationError = e.toString();
      notifyListeners();
    }
  }

  // GPS 좌표 → 동 이름 반환 (subLocality → thoroughfare → locality 순 fallback)
  static Future<String?> reverseGeocode(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isEmpty) return null;
      final p = placemarks.first;
      // 한국 주소: subLocality = 동/읍/면, thoroughfare = 로/길, locality = 시/군/구
      return p.subLocality?.isNotEmpty == true
          ? p.subLocality
          : p.thoroughfare?.isNotEmpty == true
              ? p.thoroughfare
              : p.locality;
    } catch (e) {
      AppLogger.error('Reverse geocoding failed', e, null);
      return null;
    }
  }
}
