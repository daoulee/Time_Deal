import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/deal.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../widgets/countdown_timer.dart';
import '../../widgets/empty_state_view.dart';
import '../deal_detail/deal_detail_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _allRead = false;

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return '방금';
    if (diff.inHours < 1) return '${diff.inMinutes}분 전';
    if (diff.inDays < 1) return '${diff.inHours}시간 전';
    return '${diff.inDays}일 전';
  }

  @override
  Widget build(BuildContext context) {
    final reservations = context.watch<ReservationProvider>().all;
    final deals = context.watch<DealProvider>().deals;

    // 예약 이벤트 → 알림 아이템
    final reservationNotifs = reservations.map((r) => _NotifItem(
          icon: r.status == '픽업완료'
              ? LucideIcons.checkCircle2
              : r.status == '취소'
                  ? LucideIcons.xCircle
                  : LucideIcons.clipboardList,
          title: r.status == '픽업완료'
              ? '픽업 완료 처리됐어요'
              : r.status == '취소'
                  ? '예약이 취소됐어요'
                  : '예약이 확정됐어요',
          body: '${r.deal.storeName} - ${r.deal.title}',
          time: r.formattedDate,
          isNew: !_allRead && r.status == '진행중',
          accentColor: r.status == '픽업완료'
              ? Colors.green
              : r.status == '취소'
                  ? Colors.red
                  : AppColors.primary,
          deal: r.deal,
        ));

    // 실제 deals 기반 시스템 알림
    final now = DateTime.now();
    final urgentDeals = deals.where((d) =>
        d.expiresAt.isAfter(now) &&
        d.expiresAt.difference(now).inMinutes <= 30 &&
        d.remainingStock > 0);

    final newDeals = deals.where((d) =>
        d.expiresAt.isAfter(now) &&
        d.expiresAt.difference(now).inMinutes > 30);

    final systemNotifs = _allRead ? <_NotifItem>[] : <_NotifItem>[
      ...urgentDeals.take(3).map((d) => _NotifItem(
            icon: LucideIcons.zap,
            title: '${d.storeName} 마감 임박!',
            body:
                '${d.title} ${d.remainingStock}개 남았어요. ${d.expiresAt.difference(now).inMinutes}분 후 마감!',
            time: '방금',
            isNew: true,
            accentColor: AppColors.primary,
            deal: d,
          )),
      ...newDeals.take(2).map((d) => _NotifItem(
            icon: LucideIcons.mapPin,
            title: '근처에 새 딜이 올라왔어요',
            body: '${d.storeName} - ${d.title} ${Formatters.price(d.discountedPrice)}원',
            time: _timeAgo(d.expiresAt.subtract(const Duration(hours: 1))),
            isNew: false,
            accentColor: AppColors.primary,
            deal: d,
          )),
    ];

    final allNotifs = [...reservationNotifs, ...systemNotifs];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('알림', style: TextStyle(fontWeight: FontWeight.w800)),
            if (reservationNotifs.any((n) => n.isNew)) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${reservationNotifs.where((n) => n.isNew).length}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: _allRead
                ? null
                : () => setState(() => _allRead = true),
            child: Text('모두 읽음',
                style: TextStyle(
                    color: _allRead ? Colors.grey[400] : AppColors.primary,
                    fontSize: 13)),
          ),
        ],
      ),
      body: allNotifs.isEmpty
          ? EmptyStateView(
              icon: LucideIcons.bellOff,
              title: '알림이 없어요',
              subtitle: '예약하거나 딜이 등록되면 알려드려요',
            )
          : ListView.separated(
              itemCount: allNotifs.length,
              separatorBuilder: (_, _) => Divider(
                height: 1,
                thickness: 0.5,
                indent: 70,
                endIndent: 16,
                color: Colors.grey[200],
              ),
              itemBuilder: (_, i) {
                final n = allNotifs[i];
                return _NotifTile(
                  item: n,
                  onTap: n.deal == null
                      ? null
                      : () => _showDealPreview(context, n.deal!),
                );
              },
            ),
    );
  }

  void _showDealPreview(BuildContext context, Deal deal) {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (ctx) => _DealPreviewDialog(deal: deal),
    );
  }
}

class _NotifItem {
  final IconData icon;
  final String title, body, time;
  final bool isNew;
  final Color accentColor;
  final Deal? deal;

  const _NotifItem({
    required this.icon,
    required this.title,
    required this.body,
    required this.time,
    required this.isNew,
    required this.accentColor,
    this.deal,
  });
}

class _NotifTile extends StatelessWidget {
  final _NotifItem item;
  final VoidCallback? onTap;
  const _NotifTile({required this.item, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: item.isNew
          ? AppColors.primary.withValues(alpha: 0.03)
          : Colors.transparent,
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Stack(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: item.accentColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(item.icon, size: 20, color: item.accentColor),
              ),
            ),
            if (item.isNew)
              Positioned(
                top: 0, right: 0,
                child: Container(
                  width: 10, height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
        title: Text(item.title,
            style: TextStyle(
                fontWeight: item.isNew ? FontWeight.w700 : FontWeight.w600,
                fontSize: 14)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(item.body,
                style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          ],
        ),
        trailing: Text(item.time,
            style: TextStyle(fontSize: 11, color: Colors.grey[400])),
      ),
    );
  }
}

class _DealPreviewDialog extends StatefulWidget {
  final Deal deal;
  const _DealPreviewDialog({required this.deal});

  @override
  State<_DealPreviewDialog> createState() => _DealPreviewDialogState();
}

class _DealPreviewDialogState extends State<_DealPreviewDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _slideAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _slideAnim = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String _fmtExpiry(DateTime dt) {
    final diff = dt.difference(DateTime.now());
    if (diff.inMinutes < 60) return '${diff.inMinutes}분 후 마감';
    if (diff.inHours < 24) return '${diff.inHours}시간 후 마감';
    return '${dt.month}/${dt.day} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')} 마감';
  }

  @override
  Widget build(BuildContext context) {
    final deal = widget.deal;
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 이미지 — 탭 시 딜 상세로 이동
            GestureDetector(
              onTap: () {
                final nav = Navigator.of(context);
                nav.pushReplacement(PageRouteBuilder(
                  pageBuilder: (_, animation, _) => DealDetailScreen(deal: deal),
                  transitionsBuilder: (_, animation, _, child) => FadeTransition(
                    opacity: animation,
                    child: child,
                  ),
                  transitionDuration: const Duration(milliseconds: 150),
                ));
              },
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 160,
                      child: CachedNetworkImage(
                        imageUrl: deal.imageUrl,
                        fit: BoxFit.cover,
                        memCacheWidth: 300,
                        memCacheHeight: 300,
                        fadeOutDuration: const Duration(milliseconds: 200),
                        fadeInDuration: const Duration(milliseconds: 200),
                        placeholder: (_, _) => Container(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          child: Center(child: Icon(deal.icon, size: 48, color: AppColors.primary)),
                        ),
                        errorWidget: (_, _, _) => Container(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          child: Center(child: Icon(deal.icon, size: 48, color: AppColors.primary)),
                        ),
                      ),
                    ),
                    // 탭 힌트 오버레이
                    Positioned(
                      right: 10, bottom: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.45),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.touch_app, size: 12, color: Colors.white),
                            SizedBox(width: 4),
                            Text('탭하여 상세보기',
                                style: TextStyle(color: Colors.white, fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('${deal.discountPercent}% 할인',
                      style: const TextStyle(
                          color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 8),
                Text(deal.storeName, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              ],
            ),
            const SizedBox(height: 6),
            Text(deal.title,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('${Formatters.price(deal.discountedPrice)}원',
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary)),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(LucideIcons.timer, size: 13, color: Colors.grey[400]),
                const SizedBox(width: 4),
                CountdownTimer(expiresAt: deal.expiresAt, fontSize: 13),
                const SizedBox(width: 12),
                Icon(LucideIcons.mapPin, size: 13, color: Colors.grey[400]),
                const SizedBox(width: 4),
                Text(
                  deal.distanceKm < 1
                      ? '${(deal.distanceKm * 1000).round()}m'
                      : '${deal.distanceKm.toStringAsFixed(1)}km',
                  style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                ),
              ],
            ),
            // 슬라이드 상세 패널
            SizeTransition(
              sizeFactor: _slideAnim,
              alignment: Alignment.topCenter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 14),
                  Divider(color: Colors.grey[200]),
                  const SizedBox(height: 8),
                  const Text('딜 소개',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(deal.description,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600], height: 1.5)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(LucideIcons.clock, size: 13, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Text(_fmtExpiry(deal.expiresAt),
                          style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // 버튼 2개
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      if (_ctrl.isCompleted) {
                        _ctrl.reverse();
                      } else {
                        _ctrl.forward();
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.primary),
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('상세보기',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      final nav = Navigator.of(context);
                      nav.pushReplacement(PageRouteBuilder(
                        pageBuilder: (_, _, _) => DealDetailScreen(deal: deal),
                        transitionDuration: const Duration(milliseconds: 150),
                        transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
                      ));
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('구매하기',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
