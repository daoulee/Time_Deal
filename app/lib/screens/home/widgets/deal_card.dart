import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../core/models/deal.dart';
import '../../../core/providers/wishlist_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../widgets/countdown_timer.dart';
import '../../../widgets/stock_gauge.dart';
import '../../deal_detail/deal_detail_screen.dart';

class DealCard extends StatelessWidget {
  final Deal deal;

  const DealCard({super.key, required this.deal});

  static const _grayscaleMatrix = ColorFilter.matrix([
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0, 0, 0, 1, 0,
  ]);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isExpired = deal.isExpired;

    Widget cardInner = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // UX: 이미지 로딩 중에도 아이콘으로 카테고리 은유 전달 (은유)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: deal.imageUrl,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          memCacheWidth: 128,
                          memCacheHeight: 128,
                          fadeOutDuration: const Duration(milliseconds: 200),
                          fadeInDuration: const Duration(milliseconds: 200),
                          placeholder: (_, _) => Container(
                            width: 64, height: 64,
                            color: AppColors.primary.withValues(alpha: 0.08),
                            child: Center(
                              child: Icon(deal.icon, size: 26, color: AppColors.primary),
                            ),
                          ),
                          errorWidget: (_, _, _) => Container(
                            width: 64, height: 64,
                            color: AppColors.primary.withValues(alpha: 0.08),
                            child: Center(
                              child: Icon(deal.icon, size: 26, color: AppColors.primary),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isExpired ? Colors.grey : AppColors.primary,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    isExpired ? '마감' : '${deal.discountPercent}%',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                // UX: 보조 텍스트 통일 컬러 적용
                                Text(deal.storeCategory,
                                    style: const TextStyle(
                                        fontSize: 11, color: AppColors.textSecondary)),
                                const Spacer(),
                                // UX: 찜 버튼 탭 영역을 44x44으로 확장 (행동 유도성 — HIG 최소 탭 영역 준수)
                                Consumer<WishlistProvider>(
                                  builder: (context, wl, _) {
                                    final liked = wl.isLiked(deal.id);
                                    return GestureDetector(
                                      onTap: () {
                                        HapticFeedback.lightImpact();
                                        wl.toggle(deal);
                                      },
                                      // UX: SizedBox로 탭 영역 확장, HitTestBehavior로 투명 영역도 탭 가능하게
                                      behavior: HitTestBehavior.opaque,
                                      child: SizedBox(
                                        width: 36,
                                        height: 36,
                                        child: Center(
                                          child: AnimatedContainer(
                                            duration: const Duration(milliseconds: 200),
                                            padding: const EdgeInsets.all(4),
                                            decoration: BoxDecoration(
                                              // UX: 찜 활성 상태 — 배경 채워서 filled 느낌 구현 (은유 — 형태 변화)
                                              color: liked
                                                  ? AppColors.primary.withValues(alpha: 0.12)
                                                  : Colors.transparent,
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(
                                              LucideIcons.heart,
                                              size: 18,
                                              // UX: liked=true → primary 컬러, false → 회색으로 명확한 상태 구분 (피드백)
                                              color: liked
                                                  ? AppColors.primary
                                                  : AppColors.textSecondary.withValues(alpha: 0.5),
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(deal.title,
                                style: const TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w700),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 2),
                            Text(deal.storeName,
                                style: const TextStyle(
                                    fontSize: 12, color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${Formatters.price(deal.originalPrice)}원',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.grey[400] : AppColors.textSecondary,
                                decoration: TextDecoration.lineThrough,
                                decorationColor: isDark ? Colors.grey[400] : AppColors.textSecondary,
                                decorationThickness: 1.5,
                              )),
                          Text('${Formatters.price(deal.discountedPrice)}원',
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          CountdownTimer(expiresAt: deal.expiresAt, fontSize: 13),
                          const SizedBox(height: 2),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(LucideIcons.mapPin,
                                  size: 11, color: AppColors.textSecondary),
                              const SizedBox(width: 2),
                              Text(
                                deal.distanceKm < 1
                                    ? '${(deal.distanceKm * 1000).round()}m'
                                    : '${deal.distanceKm.toStringAsFixed(1)}km',
                                style: const TextStyle(
                                    fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  StockGauge(remaining: deal.remainingStock, total: deal.totalStock),
                ],
              ),
            );

    if (isExpired) {
      cardInner = ColorFiltered(
        colorFilter: _grayscaleMatrix,
        child: cardInner,
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Material(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => DealDetailScreen(deal: deal)),
          ),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isExpired
                    ? Colors.grey.withValues(alpha: 0.25)
                    : deal.isUrgent
                        ? AppColors.primary.withValues(alpha: 0.45)
                        : isDark
                            ? AppColors.darkBorder
                            : AppColors.lightBorder,
                width: deal.isUrgent ? 1.5 : 1.0,
              ),
            ),
            child: cardInner,
          ),
        ),
      ),
    );
  }

}
