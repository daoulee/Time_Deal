import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/deal.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/wishlist_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/empty_state_view.dart';
import '../home/widgets/deal_card.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  final _listKey = GlobalKey<AnimatedListState>();
  final List<Deal> _deals = [];

  WishlistProvider? _wl;
  DealProvider? _dp;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final wl = context.read<WishlistProvider>();
    final dp = context.read<DealProvider>();

    if (_wl != wl) {
      _wl?.removeListener(_onChanged);
      _wl = wl..addListener(_onChanged);
    }
    if (_dp != dp) {
      _dp?.removeListener(_onChanged);
      _dp = dp..addListener(_onChanged);
    }

    if (_deals.isEmpty) {
      _deals.addAll(_currentDeals());
    }
  }

  @override
  void dispose() {
    _wl?.removeListener(_onChanged);
    _dp?.removeListener(_onChanged);
    super.dispose();
  }

  List<Deal> _currentDeals() {
    final wl = context.read<WishlistProvider>();
    final allDeals = context.read<DealProvider>().deals;
    return allDeals.where((d) => wl.isLiked(d.id) && !d.isExpired).toList();
  }

  void _onChanged() {
    if (!mounted) return;
    _sync(_currentDeals());
    setState(() {});
  }

  void _sync(List<Deal> next) {
    for (int i = _deals.length - 1; i >= 0; i--) {
      if (!next.any((d) => d.id == _deals[i].id)) {
        final removed = _deals.removeAt(i);
        _listKey.currentState?.removeItem(
          i,
          (_, anim) => _buildRemoved(removed, anim),
          duration: const Duration(milliseconds: 300),
        );
      }
    }
    for (int i = 0; i < next.length; i++) {
      if (!_deals.any((d) => d.id == next[i].id)) {
        _deals.insert(i, next[i]);
        _listKey.currentState?.insertItem(i, duration: const Duration(milliseconds: 200));
      }
    }
  }

  Widget _buildRemoved(Deal deal, Animation<double> anim) {
    return SizeTransition(
      sizeFactor: CurvedAnimation(parent: anim, curve: Curves.easeOut),
      alignment: Alignment.topCenter,
      child: FadeTransition(
        opacity: CurvedAnimation(parent: anim, curve: const Interval(0.0, 0.6)),
        child: DealCard(deal: deal),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.heart, size: 18, color: AppColors.primary),
            const SizedBox(width: 8),
            const Text('찜 목록', style: TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
      ),
      body: _deals.isEmpty
          ? EmptyStateView(
              icon: LucideIcons.heartOff,
              title: '찜한 딜이 없어요',
              subtitle: '마음에 드는 딜의 하트를 눌러보세요',
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Text('찜한 딜 ${_deals.length}개',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ),
                Expanded(
                  child: AnimatedList(
                    key: _listKey,
                    initialItemCount: _deals.length,
                    itemBuilder: (_, i, anim) => FadeTransition(
                      opacity: anim,
                      child: DealCard(deal: _deals[i]),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
