import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/deal.dart';
import '../services/device_id.dart';
import '../utils/app_logger.dart';

class WishlistProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  /// 현재 사용자 식별자: 로그인된 Auth user.id 우선, 게스트 시 디바이스 UUID fallback
  String get _userId => DeviceId.value;

  Set<String> _likedIds = {};
  bool _disposed = false;

  WishlistProvider() {
    _load();
  }

  Future<void> _load() async {
    if (_userId.isEmpty) return; // 비로그인 시 조회 스킵
    try {
      final data = await _supabase
          .from('wishlists')
          .select('deal_id')
          .eq('user_id', _userId);
      _likedIds = {for (final row in data as List) row['deal_id'] as String};
    } catch (e, st) {
      AppLogger.error('Failed to load wishlist', e, st);
    }
    if (_disposed) return;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  bool isLiked(String dealId) => _likedIds.contains(dealId);

  int get count => _likedIds.length;

  Future<void> toggle(Deal deal) async {
    final wasLiked = _likedIds.contains(deal.id);
    if (wasLiked) {
      _likedIds.remove(deal.id);
    } else {
      _likedIds.add(deal.id);
    }
    notifyListeners();
    // mock 딜은 실제 deals 테이블에 없으므로 DB 저장 불필요
    if (deal.id.startsWith('mock')) return;
    // 비로그인 시 로컬 토글만 반영하고 DB 동기화는 스킵 (빈 user_id로 쓰지 않도록)
    if (_userId.isEmpty) return;
    try {
      if (wasLiked) {
        await _supabase
            .from('wishlists')
            .delete()
            .eq('user_id', _userId)
            .eq('deal_id', deal.id);
      } else {
        await _supabase.from('wishlists').upsert(
          {'user_id': _userId, 'deal_id': deal.id},
          onConflict: 'user_id,deal_id',
        );
      }
    } catch (e, st) {
      AppLogger.error('찜 토글 실패', e, st);
      // 실패 시 원래 상태로 롤백
      if (wasLiked) {
        _likedIds.add(deal.id);
      } else {
        _likedIds.remove(deal.id);
      }
      notifyListeners();
    }
  }
  // [Claude | 2026-08-21] 수정범위: WishlistProvider 전체 — DeviceId.value → Auth user.id(_userId getter) 전환, 비로그인 guard 추가 (Kiro 요청 Auth 전환 작업 #1)
}
