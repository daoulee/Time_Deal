import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/deal.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/theme/app_colors.dart';
import '../home/widgets/deal_card.dart';

class StoreScreen extends StatelessWidget {
  final Deal representativeDeal;

  const StoreScreen({super.key, required this.representativeDeal});

  @override
  Widget build(BuildContext context) {
    final deal = representativeDeal;
    final storeDeals = context
        .watch<DealProvider>()
        .deals
        .where((d) => d.storeId == deal.storeId)
        .toList();

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 160,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFF6B35), AppColors.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          width: 64, height: 64,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Center(
                            child: Icon(deal.icon, size: 32, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(deal.storeName,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(LucideIcons.tag,
                                      size: 12, color: Colors.white70),
                                  const SizedBox(width: 4),
                                  Text(deal.storeCategory,
                                      style: const TextStyle(
                                          color: Colors.white70, fontSize: 12)),
                                  const SizedBox(width: 12),
                                  Icon(LucideIcons.mapPin,
                                      size: 12, color: Colors.white70),
                                  const SizedBox(width: 4),
                                  Text(
                                    deal.distanceKm < 1
                                        ? '${(deal.distanceKm * 1000).round()}m'
                                        : '${deal.distanceKm}km',
                                    style: const TextStyle(
                                        color: Colors.white70, fontSize: 12),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 가게 정보
                  Row(
                    children: [
                      _InfoChip(icon: LucideIcons.clock3, label: '영업중'),
                      const SizedBox(width: 8),
                      _InfoChip(icon: LucideIcons.star, label: '4.8'),
                      const SizedBox(width: 8),
                      _InfoChip(
                          icon: LucideIcons.mapPin,
                          label: deal.distanceKm < 1
                              ? '${(deal.distanceKm * 1000).round()}m'
                              : '${deal.distanceKm}km'),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '진행중인 딜 ${storeDeals.length}개',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (storeDeals.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Center(
                  child: Text('현재 진행중인 딜이 없어요',
                      style: TextStyle(color: Colors.grey)),
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (_, i) => DealCard(deal: storeDeals[i]),
                childCount: storeDeals.length,
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(label,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary)),
        ],
      ),
    );
  }
}
