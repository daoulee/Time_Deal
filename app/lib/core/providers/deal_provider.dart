import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/mock_data.dart';
import '../models/deal.dart';
import '../utils/geo_utils.dart';
import '../utils/app_logger.dart';

class DealProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  List<Deal> _deals = [];
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

  Future<void> refresh() => _load();

  Future<void> _load() async {
    try {
      final data = await _supabase
          .from('deals')
          .select()
          .gt('expires_at', DateTime.now().toUtc().toIso8601String())
          .order('created_at', ascending: false) as List<dynamic>;
      final loaded = data.map((j) => Deal.fromJson(j as Map<String, dynamic>)).toList();
      _deals = loaded;
    } catch (e, st) {
      AppLogger.error('Failed to load deals from Supabase', e, st);
      error = e.toString();
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

  void updateDistances(double userLat, double userLng, {String? neighborhood, double? centerLat, double? centerLng}) {
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

    _applyDistancesIfKnown();
    notifyListeners();
  }
  // [Antigravity | 2026-08-21] 수정범위: DealProvider — 데모 목(mock) 데이터 전면 제거, Supabase 실시간 백엔드 데이터만 바인딩

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
    // 실제 가게 위치가 저장돼 있으면 그걸 사용 (웹/앱 공통으로 같은 좌표를 봄)
    if (deal.storeLat != null && deal.storeLng != null) {
      return (deal.storeLat!, deal.storeLng!);
    }
    // 위치가 없는 옛날/mock 딜은 뷰어 위치 기준 가짜 좌표로 대체 표시 (하위호환)
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
  // [Claude | 2026-08-21] 수정범위: _coordForDeal() — 저장된 실제 store_lat/store_lng 우선 사용, 없을 때만 기존 가짜 좌표 폴백

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
    double? storeLat,
    double? storeLng,
    String? neighborhood,
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
      storeLat: storeLat,
      storeLng: storeLng,
      neighborhood: neighborhood,
    );
  }
  // [Claude | 2026-08-21] 수정범위: createFromForm() storeId — DeviceId.value → Supabase Auth user.id 전환 (Kiro 요청 Auth 전환 작업 #2)
  // [Claude | 2026-08-21] 수정범위: createFromForm() storeLat/storeLng/neighborhood 파라미터 추가 — 딜 등록 시 실제 가게 위치를 DB에 저장 (웹 연동용)
}
