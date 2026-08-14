import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/deal.dart';
import '../services/device_id.dart';

class WishlistProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  Set<String> _likedIds = {};
  bool _disposed = false;

  WishlistProvider() {
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _supabase
          .from('wishlists')
          .select('deal_id')
          .eq('user_id', DeviceId.value);
      _likedIds = {for (final row in data as List) row['deal_id'] as String};
    } catch (_) {}
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
    if (_likedIds.contains(deal.id)) {
      _likedIds.remove(deal.id);
      notifyListeners();
      try {
        await _supabase
            .from('wishlists')
            .delete()
            .eq('user_id', DeviceId.value)
            .eq('deal_id', deal.id);
      } catch (_) {}
    } else {
      _likedIds.add(deal.id);
      notifyListeners();
      try {
        await _supabase.from('wishlists').insert({
          'user_id': DeviceId.value,
          'deal_id': deal.id,
        });
      } catch (_) {}
    }
  }
}
