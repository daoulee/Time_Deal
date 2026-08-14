import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/empty_state_view.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  String _fmt(int price) => price
      .toString()
      .replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');

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
          isNew: r.status == '진행중',
          accentColor: r.status == '픽업완료'
              ? Colors.green
              : r.status == '취소'
                  ? Colors.red
                  : AppColors.primary,
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

    final systemNotifs = <_NotifItem>[
      ...urgentDeals.take(3).map((d) => _NotifItem(
            icon: LucideIcons.zap,
            title: '${d.storeName} 마감 임박!',
            body:
                '${d.title} ${d.remainingStock}개 남았어요. ${d.expiresAt.difference(now).inMinutes}분 후 마감!',
            time: '방금',
            isNew: true,
            accentColor: AppColors.primary,
          )),
      ...newDeals.take(2).map((d) => _NotifItem(
            icon: LucideIcons.mapPin,
            title: '근처에 새 딜이 올라왔어요',
            body: '${d.storeName} - ${d.title} ${_fmt(d.discountedPrice)}원',
            time: _timeAgo(d.expiresAt.subtract(const Duration(hours: 1))),
            isNew: false,
            accentColor: AppColors.primary,
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
            onPressed: () {},
            child: const Text('모두 읽음',
                style: TextStyle(color: AppColors.primary, fontSize: 13)),
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
              separatorBuilder: (_, _) => const Divider(height: 1, indent: 70),
              itemBuilder: (_, i) {
                final n = allNotifs[i];
                return _NotifTile(item: n);
              },
            ),
    );
  }
}

class _NotifItem {
  final IconData icon;
  final String title, body, time;
  final bool isNew;
  final Color accentColor;

  const _NotifItem({
    required this.icon,
    required this.title,
    required this.body,
    required this.time,
    required this.isNew,
    required this.accentColor,
  });
}

class _NotifTile extends StatelessWidget {
  final _NotifItem item;
  const _NotifTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: item.isNew
          ? AppColors.primary.withValues(alpha: 0.03)
          : null,
      child: ListTile(
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
