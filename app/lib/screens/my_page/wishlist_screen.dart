import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/wishlist_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/empty_state_view.dart';
import '../home/widgets/deal_card.dart';

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final wl = context.watch<WishlistProvider>();
    final allDeals = context.watch<DealProvider>().deals;
    final likedDeals = allDeals.where((d) => wl.isLiked(d.id)).toList();

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
      body: likedDeals.isEmpty
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
                  child: Text('찜한 딜 ${likedDeals.length}개',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: likedDeals.length,
                    itemBuilder: (_, i) => DealCard(deal: likedDeals[i]),
                  ),
                ),
              ],
            ),
    );
  }
}
