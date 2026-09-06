import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/korean_dongs.dart';
import '../data/mock_data.dart';
import '../utils/app_logger.dart';
import '../utils/geo_utils.dart';

class LocationProvider extends ChangeNotifier {
  static const _key = 'neighborhood';
  static const _radiusKey = 'search_radius_km';

  String _neighborhood = '은행동';
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

  // [Antigravity | 2026-08-23] 수정범위: checkNeighborhoodMismatch() & confirmNeighborhoodReverification() — 앱 종료/재시작 시 동네 변경 감지 및 강제 재인증 연동 로직
  Future<({bool hasMismatch, String previousNeighborhood, String currentNeighborhood, Position position})?>
      checkNeighborhoodMismatch() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      if (permission == LocationPermission.deniedForever) return null;

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
      _position = pos;

      final currentDong = await reverseGeocode(pos.latitude, pos.longitude);
      if (currentDong != null && currentDong.isNotEmpty) {
        if (_neighborhood.isNotEmpty && currentDong != _neighborhood) {
          return (
            hasMismatch: true,
            previousNeighborhood: _neighborhood,
            currentNeighborhood: currentDong,
            position: pos,
          );
        }
      }
    } catch (e, st) {
      AppLogger.error('Failed checking neighborhood mismatch', e, st);
    }
    return null;
  }

  Future<void> confirmNeighborhoodReverification(String newDong, Position pos) async {
    _neighborhood = newDong;
    _position = pos;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, newDong);
    await prefs.setDouble('last_lat', pos.latitude);
    await prefs.setDouble('last_lng', pos.longitude);
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

  // [Antigravity | 2026-08-23] 수정범위: fetchNearbyDongs() & fetchNearbyDongsDetailed() — 선택한 반경(1km, 3km, 5km, 10km) 내의 모든 동네를 가장 가까운 거리(0km)부터 최대 반경까지 완벽하게 정렬하여 반환
  static Future<List<NearbyDong>> fetchNearbyDongsDetailed(
      double lat, double lng, int radiusKm) async {
    final Map<String, NearbyDong> results = {};

    // 1. 역지오코딩으로 현재 중심 동네 추가 (0.0km)
    final centerDong = await reverseGeocode(lat, lng);
    if (centerDong != null && centerDong.isNotEmpty) {
      results[centerDong] = NearbyDong(
        name: centerDong,
        distanceKm: 0.0,
        district: '현재 내 위치',
      );
    }

    // 2. 표준 데이터셋 기반 0.0km ~ radiusKm 이내의 모든 동네 수집
    final databaseDongs = getDongsWithinRadius(lat, lng, radiusKm.toDouble());
    for (final d in databaseDongs) {
      if (!results.containsKey(d.name)) {
        results[d.name] = d;
      }
    }

    // 3. 동심원 다각도 지오코딩 (0.5km ~ radiusKm 사이의 추가 지역 역지오코딩 보강)
    final stepR = radiusKm <= 3 ? 1.0 : 2.0;
    for (double r = stepR; r <= radiusKm; r += stepR) {
      for (final bearing in [0.0, 90.0, 180.0, 270.0]) {
        final pt = GeoUtils.offsetPoint(lat, lng, r, bearing);
        final dong = await reverseGeocode(pt.lat, pt.lng);
        if (dong != null && dong.isNotEmpty && !results.containsKey(dong)) {
          final dist = GeoUtils.haversine(lat, lng, pt.lat, pt.lng);
          if (dist <= radiusKm) {
            results[dong] = NearbyDong(
              name: dong,
              distanceKm: dist,
              district: '인근 동네',
            );
          }
        }
      }
    }

    final list = results.values.toList();
    // 가장 가까운 동네부터 최대 반경까지 거리순 오름차순 정렬
    list.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
    return list;
  }

  static Future<List<String>> fetchNearbyDongs(
      double lat, double lng, int radiusKm) async {
    final detailed = await fetchNearbyDongsDetailed(lat, lng, radiusKm);
    return detailed.map((d) => d.name).toList();
  }
}
