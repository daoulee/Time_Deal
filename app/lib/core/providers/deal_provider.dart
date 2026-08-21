import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/mock_data.dart';
import '../models/deal.dart';
import '../utils/geo_utils.dart';
import '../utils/app_logger.dart';

class DealProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  List<Deal> _deals = List.from(mockDeals);
  RealtimeChannel? _channel;
  Timer? _expiryTimer;
  bool _disposed = false;
  String? error;

  double? _lastLat;
  double? _lastLng;

  List<Deal> get deals => List.unmodifiable(_deals);

  DealProvider() {
    _load();
    _expiryTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      final before = _deals.length;
      _deals.removeWhere((d) => d.isExpired);
      if (_deals.length != before && !_disposed) notifyListeners();
    });
  }

  Future<void> _load() async {
    try {
      final data = await _supabase
          .from('deals')
          .select()
          .gt('expires_at', DateTime.now().toUtc().toIso8601String())
          .order('created_at', ascending: false) as List<dynamic>;
      final loaded = data.map((j) => Deal.fromJson(j as Map<String, dynamic>)).toList();
      // Supabase에 실제 딜이 있으면 사용, 없으면 mock 유지 (데모용)
      if (loaded.isNotEmpty) {
        _deals = loaded;
      }
    } catch (e, st) {
      AppLogger.error('Failed to load deals', e, st);
      error = e.toString();
      if (_disposed) return;
      notifyListeners();
    }
    _applyDistancesIfKnown();
    if (_disposed) return;
    notifyListeners();
    if (_channel == null) _subscribe();
  }

  void _subscribe() {
    _channel = _supabase
        .channel('deals-changes')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'deals',
          callback: (_) => _load(),
        )
        .subscribe();
  }

  @override
  void dispose() {
    _disposed = true;
    _expiryTimer?.cancel();
    if (_channel != null) _supabase.removeChannel(_channel!);
    super.dispose();
  }

  List<Deal> byCategory(String category) {
    final active = _deals.where((d) => !d.isExpired).toList();
    return category == '전체'
        ? active
        : active.where((d) => d.storeCategory == category).toList();
  }

  Future<void> addDeal(Deal deal) async {
    _deals.insert(0, deal);
    notifyListeners();
    try {
      await _supabase.from('deals').insert(deal.toJson());
    } catch (e, st) {
      AppLogger.error('Failed to insert deal', e, st);
    }
  }

  // 실제 동네가 확인되기 전엔 빈 문자열 — generateMockDeals()가 빈 값이면 '우리동네'로 대체 표시함
  String _currentNeighborhood = '';

  void updateDistances(double userLat, double userLng, {String? neighborhood, double? centerLat, double? centerLng}) {
    // 시뮬레이터 기본 GPS(미국 쿠퍼티노 등) 대응: 기준 좌표에서 50km 넘게 벗어나면
    // 실제 GPS 대신 기준 좌표(딜 중심)를 사용해 거리가 비정상적으로 크게 뜨는 것 방지
    final refLat = centerLat ?? dealCenter.lat;
    final refLng = centerLng ?? dealCenter.lng;
    final distToCenter = GeoUtils.haversine(userLat, userLng, refLat, refLng);
    if (distToCenter > 50.0) {
      _lastLat = refLat;
      _lastLng = refLng;
    } else {
      _lastLat = userLat;
      _lastLng = userLng;
    }
    if (neighborhood != null && neighborhood.isNotEmpty) {
      _currentNeighborhood = neighborhood;
    }

    // 등록된 딜이 mock 딜뿐이라면, 사용자의 실제 GPS/동네 주변으로 mock 딜을 동적 생성
    final onlyMocks = _deals.every((d) => d.id.startsWith('mock_'));
    if (onlyMocks) {
      _deals = generateMockDeals(userLat, userLng, _currentNeighborhood);
    }

    _applyDistancesIfKnown();
    notifyListeners();
  }
  // [Claude | 2026-08-21] 수정범위: updateDistances() — Kiro 지적사항 #2, 50km 초과 시 기준 좌표로 폴백하는 로직 복원 (시뮬레이터 GPS 대응)
  // [Claude | 2026-08-21] 수정범위: _currentNeighborhood 초기값 — Kiro 지적사항 #3, 하드코딩된 '비산동' 대신 빈 문자열로 변경

  void _applyDistancesIfKnown() {
    if (_lastLat == null || _lastLng == null) return;
    _deals = _deals.map((deal) {
      final (lat, lng) = _coordForDeal(deal);
      return deal.copyWith(
        distanceKm: GeoUtils.haversine(_lastLat!, _lastLng!, lat, lng),
      );
    }).toList();
    _deals.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
  }

  (double, double) _coordForDeal(Deal deal) {
    final baseLat = _lastLat ?? dealCenter.lat;
    final baseLng = _lastLng ?? dealCenter.lng;
    final offset = mockDealOffsets[deal.id];
    if (offset != null) {
      return (baseLat + offset.latOffset, baseLng + offset.lngOffset);
    }
    final hash = deal.id.hashCode;
    final latOffset = ((hash % 100) - 50) * 0.00015;
    final lngOffset = ((hash ~/ 100 % 100) - 50) * 0.00015;
    return (baseLat + latOffset, baseLng + lngOffset);
  }

  static Deal createFromForm({
    required String id,
    required String title,
    required String description,
    required int originalPrice,
    required int discountedPrice,
    required int stock,
    required int hours,
    required String storeCategory,
    required String iconName,
    required String imageUrl,
    String storeName = '우리 동네 가게',
  }) {
    final now = DateTime.now();
    return Deal(
      id: id,
      storeId: Supabase.instance.client.auth.currentUser?.id ?? '',
      storeName: storeName,
      storeCategory: storeCategory,
      title: title,
      description: description,
      originalPrice: originalPrice,
      discountedPrice: discountedPrice,
      totalStock: stock,
      remainingStock: stock,
      expiresAt: now.add(Duration(hours: hours)),
      distanceKm: 0.2,
      iconName: iconName,
      imageUrl: imageUrl,
    );
  }
  // [Claude | 2026-08-21] 수정범위: createFromForm() storeId — DeviceId.value → Supabase Auth user.id 전환 (Kiro 요청 Auth 전환 작업 #2)
}
