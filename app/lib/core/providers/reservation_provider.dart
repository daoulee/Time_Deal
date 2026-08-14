import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/deal.dart';
import '../models/reservation.dart';
import '../services/device_id.dart';

class ReservationProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  List<Reservation> _reservations = [];
  List<Reservation> _merchantReservations = [];
  RealtimeChannel? _channel;
  bool _disposed = false;

  List<Reservation> get all => List.unmodifiable(_reservations);
  List<Reservation> get merchantAll => List.unmodifiable(_merchantReservations);

  ReservationProvider() {
    _load();
  }

  Future<void> _load() async {
    // 내 예약 목록 (user_id 기준)
    try {
      final data = await _supabase
          .from('reservations')
          .select('*, deals(*)')
          .eq('user_id', DeviceId.value)
          .order('reserved_at', ascending: false);
      _reservations =
          (data as List).map((j) => Reservation.fromJson(j)).toList();
    } catch (_) {}

    // 상인 예약 목록: 내 store_id 딜에 달린 예약만 (Fix #1)
    // deals 테이블을 먼저 조회해 본인 딜만 가져온 후 reservation 조인
    try {
      final myDeals = await _supabase
          .from('deals')
          .select('*, reservations(*)')
          .eq('store_id', DeviceId.value);

      final flat = <Map<String, dynamic>>[];
      for (final deal in myDeals as List) {
        final dealMap = Map<String, dynamic>.from(deal);
        final rsvs = dealMap.remove('reservations') as List? ?? [];
        for (final r in rsvs) {
          flat.add({...r as Map<String, dynamic>, 'deals': dealMap});
        }
      }
      flat.sort((a, b) =>
          (b['reserved_at'] as String).compareTo(a['reserved_at'] as String));
      _merchantReservations = flat.map((j) => Reservation.fromJson(j)).toList();
    } catch (_) {}

    if (_disposed) return;
    notifyListeners();
    if (_channel == null) _subscribe();
  }

  void _subscribe() {
    _channel = _supabase
        .channel('reservations-all')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'reservations',
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

  List<Reservation> byStatus(String status) =>
      _reservations.where((r) => r.status == status).toList();

  List<Reservation> merchantByStatus(String status) =>
      _merchantReservations.where((r) => r.status == status).toList();

  bool isReserved(String dealId) =>
      _reservations.any((r) => r.deal.id == dealId && r.status == '진행중');

  Future<bool> reserve(Deal deal) async {
    // Fix #2: 클라이언트 이중예약·재고 0 사전 차단
    if (isReserved(deal.id)) return false;
    if (deal.remainingStock <= 0) return false;

    // Optimistic insert
    final temp = Reservation(
      id: '_tmp_${DateTime.now().millisecondsSinceEpoch}',
      userId: DeviceId.value,
      deal: deal,
      reservedAt: DateTime.now(),
    );
    _reservations.insert(0, temp);
    notifyListeners();

    try {
      await _supabase.from('reservations').insert({
        'user_id': DeviceId.value,
        'deal_id': deal.id,
        'status': '진행중',
        'reserved_at': DateTime.now().toUtc().toIso8601String(),
      });

      // Fix #3: atomic decrement — remaining_stock > 0 조건 서버에서 재검증
      // Supabase RPC `decrement_stock` 가 있으면 사용, 없으면 조건부 update fallback
      try {
        await _supabase.rpc('decrement_stock', params: {'deal_id': deal.id});
      } catch (_) {
        // RPC 미생성 시 fallback: gt 조건으로 음수 방지
        await _supabase
            .from('deals')
            .update({'remaining_stock': deal.remainingStock - 1})
            .eq('id', deal.id)
            .gt('remaining_stock', 0);
      }
      return true;
    } catch (_) {
      // 예약 삽입 실패 시 optimistic 항목 제거
      _reservations.remove(temp);
      notifyListeners();
      return false;
    }
  }

  Future<void> complete(String id) async {
    final mIdx = _merchantReservations.indexWhere((r) => r.id == id);
    final cIdx = _reservations.indexWhere((r) => r.id == id);
    if (mIdx == -1 && cIdx == -1) return;
    if (mIdx != -1) _merchantReservations[mIdx].status = '픽업완료';
    if (cIdx != -1) _reservations[cIdx].status = '픽업완료';
    notifyListeners();
    try {
      await _supabase
          .from('reservations')
          .update({'status': '픽업완료'})
          .eq('id', id);
    } catch (_) {
      final rollMIdx = _merchantReservations.indexWhere((r) => r.id == id);
      final rollCIdx = _reservations.indexWhere((r) => r.id == id);
      if (rollMIdx != -1) _merchantReservations[rollMIdx].status = '진행중';
      if (rollCIdx != -1) _reservations[rollCIdx].status = '진행중';
      notifyListeners();
    }
  }

  Future<void> cancel(String id) async {
    // 소비자 취소
    final uIdx = _reservations.indexWhere((r) => r.id == id);
    // 상인 취소
    final mIdx = _merchantReservations.indexWhere((r) => r.id == id);
    if (uIdx == -1 && mIdx == -1) return;

    if (uIdx != -1) _reservations[uIdx].status = '취소';
    if (mIdx != -1) _merchantReservations[mIdx].status = '취소';
    notifyListeners();

    try {
      await _supabase
          .from('reservations')
          .update({'status': '취소'})
          .eq('id', id);
    } catch (_) {
      final ruIdx = _reservations.indexWhere((r) => r.id == id);
      final rmIdx = _merchantReservations.indexWhere((r) => r.id == id);
      if (ruIdx != -1) _reservations[ruIdx].status = '진행중';
      if (rmIdx != -1) _merchantReservations[rmIdx].status = '진행중';
      notifyListeners();
    }
  }
}
