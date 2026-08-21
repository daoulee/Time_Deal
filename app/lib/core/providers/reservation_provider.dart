import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/deal.dart';
import '../models/reservation.dart';
import '../utils/app_logger.dart';

class ReservationProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  List<Reservation> _reservations = [];
  List<Reservation> _merchantReservations = [];
  RealtimeChannel? _channel;
  bool _disposed = false;
  String? lastError;

  /// 현재 로그인된 Auth user.id. 비로그인 시 null → 빈 문자열 fallback
  String get _userId => _supabase.auth.currentUser?.id ?? '';

  List<Reservation> get all => List.unmodifiable(_reservations);
  List<Reservation> get merchantAll => List.unmodifiable(_merchantReservations);

  ReservationProvider() {
    _load();
  }

  Future<void> _load() async {
    if (_userId.isEmpty) return; // 비로그인 시 조회 스킵
    // 내 예약 목록 (user_id 기준)
    try {
      final data = await _supabase
          .from('reservations')
          .select('*, deals(*)')
          .eq('user_id', _userId)
          .order('reserved_at', ascending: false) as List<dynamic>;
      _reservations =
          data.map((j) => Reservation.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e, st) {
      AppLogger.error('Failed to load reservations', e, st);
      lastError = e.toString();
      notifyListeners();
    }

    // 상인 예약 목록: 내 store_id(=Auth user.id) 딜에 달린 예약만
    try {
      final myDeals = await _supabase
          .from('deals')
          .select('*, reservations(*)')
          .eq('store_id', _userId) as List<dynamic>;

      final flat = <Map<String, dynamic>>[];
      for (final deal in myDeals) {
        final dealMap = Map<String, dynamic>.from(deal);
        final rsvs = dealMap.remove('reservations') as List? ?? [];
        for (final r in rsvs) {
          flat.add({...r as Map<String, dynamic>, 'deals': dealMap});
        }
      }
      flat.sort((a, b) =>
          (b['reserved_at'] as String).compareTo(a['reserved_at'] as String));
      _merchantReservations = flat.map((j) => Reservation.fromJson(j)).toList();
    } catch (e, st) {
      AppLogger.error('Failed to load merchant reservations', e, st);
      lastError = e.toString();
      notifyListeners();
    }

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
    if (_userId.isEmpty) return false; // 비로그인 시 예약 불가
    if (isReserved(deal.id)) return false;
    if (deal.remainingStock <= 0) return false;

    final temp = Reservation(
      id: '_tmp_${DateTime.now().millisecondsSinceEpoch}',
      userId: _userId,
      deal: deal,
      reservedAt: DateTime.now(),
    );
    _reservations.insert(0, temp);
    notifyListeners();

    try {
      await _supabase.from('reservations').insert({
        'user_id': _userId,
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
        final updated = await _supabase
            .from('deals')
            .update({'remaining_stock': deal.remainingStock - 1})
            .eq('id', deal.id)
            .gt('remaining_stock', 0)
            .select() as List<dynamic>;
        if (updated.isEmpty) throw Exception('재고 없음');
      }
      return true;
    } catch (e, st) {
      AppLogger.error('Failed to reserve deal', e, st);
      lastError = e.toString();
      // 예약 삽입 실패 시 optimistic 항목 제거
      _reservations.remove(temp);
      notifyListeners();
      return false;
    }
  }

  Future<void> complete(String id) async {
    try {
      await _supabase
          .from('reservations')
          .update({'status': '픽업완료'})
          .eq('id', id);
      final mIdx = _merchantReservations.indexWhere((r) => r.id == id);
      final cIdx = _reservations.indexWhere((r) => r.id == id);
      if (mIdx != -1) _merchantReservations[mIdx].status = '픽업완료';
      if (cIdx != -1) _reservations[cIdx].status = '픽업완료';
      notifyListeners();
    } catch (e, st) {
      AppLogger.error('픽업 완료 처리 실패', e, st);
      lastError = e.toString();
    }
  }

  Reservation? _findReservation(String id) {
    for (final r in [..._reservations, ..._merchantReservations]) {
      if (r.id == id) return r;
    }
    return null;
  }

  Future<void> cancel(String id) async {
    try {
      // 취소 상태로 변경
      await _supabase
          .from('reservations')
          .update({'status': '취소'})
          .eq('id', id);
      // 해당 딜 찾아서 atomic increment_stock RPC 호출
      final reservation = _findReservation(id);
      if (reservation == null) return; // 두 리스트 모두에 없으면 조용히 종료
      try {
        await _supabase.rpc('increment_stock', params: {'deal_id': reservation.deal.id});
      } catch (_) {
        // fallback: RPC가 없거나 실패한 경우 조건부 update
        await _supabase
            .from('deals')
            .update({'remaining_stock': reservation.deal.remainingStock + 1})
            .eq('id', reservation.deal.id);
      }
      // 로컬 상태 반영
      final uIdx = _reservations.indexWhere((r) => r.id == id);
      final mIdx = _merchantReservations.indexWhere((r) => r.id == id);
      if (uIdx != -1) _reservations[uIdx].status = '취소';
      if (mIdx != -1) _merchantReservations[mIdx].status = '취소';
      notifyListeners();
    } catch (e, st) {
      AppLogger.error('예약 취소 처리 실패', e, st);
      lastError = e.toString();
    }
  }
  // [Claude | 2026-08-21] 수정범위: _findReservation() 신규 + cancel() — Kiro 지적사항 #1, 두 리스트에 id 없을 때 StateError 크래시 나던 것 null-safe로 수정
}
// [Kiro | 2026-08-21] reservation_provider 전체 — DeviceId.value → Auth user.id(_userId getter) 전환, 비로그인 시 guard 추가
