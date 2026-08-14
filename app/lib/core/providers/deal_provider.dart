import 'dart:math';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/mock_data.dart';
import '../models/deal.dart';
import '../services/device_id.dart';

class DealProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  List<Deal> _deals = List.from(mockDeals);
  RealtimeChannel? _channel;
  bool _disposed = false;

  double? _lastLat;
  double? _lastLng;

  List<Deal> get deals => List.unmodifiable(_deals);

  DealProvider() {
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _supabase
          .from('deals')
          .select()
          .gt('expires_at', DateTime.now().toUtc().toIso8601String())
          .order('created_at', ascending: false);
      final loaded = (data as List).map((j) => Deal.fromJson(j)).toList();
      if (loaded.isNotEmpty) {
        _deals = loaded;
      }
    } catch (_) {
      // keep mock data on error
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
    } catch (_) {}
  }

  void updateDistances(double userLat, double userLng, {double? centerLat, double? centerLng}) {
    // 시뮬레이터/해외 GPS: 동네 중심에서 50km 초과 시 동네 중심 기준으로 fallback
    final refLat = centerLat ?? dealCenter.lat;
    final refLng = centerLng ?? dealCenter.lng;
    final distToCenter = _haversine(userLat, userLng, refLat, refLng);
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

  void _applyDistancesIfKnown() {
    if (_lastLat == null || _lastLng == null) return;
    for (final deal in _deals) {
      final (lat, lng) = _coordForDeal(deal);
      deal.distanceKm = _haversine(_lastLat!, _lastLng!, lat, lng);
    }
    _deals.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
  }

  (double, double) _coordForDeal(Deal deal) {
    final c = dealCoordinates[deal.id];
    if (c != null) return (c.lat, c.lng);
    final hash = deal.id.hashCode;
    final latOffset = ((hash % 100) - 50) * 0.0002;
    final lngOffset = ((hash ~/ 100 % 100) - 50) * 0.0002;
    return (dealCenter.lat + latOffset, dealCenter.lng + lngOffset);
  }

  double _haversine(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371.0;
    final dLat = (lat2 - lat1) * pi / 180;
    final dLng = (lng2 - lng1) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) *
            cos(lat2 * pi / 180) *
            sin(dLng / 2) *
            sin(dLng / 2);
    return r * 2 * atan2(sqrt(a), sqrt(1 - a));
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
    String storeName = '성수 베이커리',
  }) {
    final now = DateTime.now();
    return Deal(
      id: id,
      storeId: DeviceId.value,
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
}
