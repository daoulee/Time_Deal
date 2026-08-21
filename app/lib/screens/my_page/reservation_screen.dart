import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/reservation.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/status_colors.dart';

class ReservationScreen extends StatefulWidget {
  const ReservationScreen({super.key});

  @override
  State<ReservationScreen> createState() => _ReservationScreenState();
}

class _ReservationScreenState extends State<ReservationScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('예약 내역', style: TextStyle(fontWeight: FontWeight.w800)),
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppColors.primary,
          dividerColor: Colors.transparent,
          tabs: const [
            Tab(text: '진행중'),
            Tab(text: '픽업완료'),
            Tab(text: '취소'),
          ],
        ),
        // [Claude | 2026-08-21] 수정범위: TabBar dividerColor 추가 — M3 기본 전체폭 구분선(검은 줄) 제거
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _ReservationList(status: '진행중'),
          _ReservationList(status: '픽업완료'),
          _ReservationList(status: '취소'),
        ],
      ),
    );
  }
}

class _ReservationList extends StatelessWidget {
  final String status;
  const _ReservationList({required this.status});

  @override
  Widget build(BuildContext context) {
    final items = context.watch<ReservationProvider>().byStatus(status);

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.clipboardList, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text('$status 예약이 없어요',
                style: TextStyle(fontSize: 14, color: Colors.grey[400])),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _ReservationCard(reservation: items[i]),
    );
  }
}

class _ReservationCard extends StatelessWidget {
  final Reservation reservation;
  const _ReservationCard({required this.reservation});

  @override
  Widget build(BuildContext context) {
    final r = reservation;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
        color: Theme.of(context).cardTheme.color,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Icon(r.deal.icon, size: 22, color: AppColors.primary),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.deal.storeName,
                        style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                    const SizedBox(height: 2),
                    Text(r.deal.title,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: StatusColors.background(r.status),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  r.status,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: StatusColors.foreground(r.status),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(LucideIcons.tag, size: 14, color: Colors.grey[400]),
              const SizedBox(width: 6),
              Text('${r.formattedPrice}원',
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
              const Spacer(),
              Icon(LucideIcons.clock, size: 13, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text(r.formattedDate,
                  style: TextStyle(fontSize: 12, color: Colors.grey[500])),
            ],
          ),
          const SizedBox(height: 10),

          // [Antigravity | 2026-08-21] 수정범위: _ReservationCard — 스윙 방식 노쇼 방지 가결제(Hold) 상태 및 픽업 시 자동 취소 알림 배너
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: r.status == '픽업완료'
                  ? const Color(0xFF10B981).withValues(alpha: 0.08)
                  : r.status == '진행중'
                      ? AppColors.primary.withValues(alpha: 0.06)
                      : Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  r.status == '픽업완료'
                      ? LucideIcons.checkCircle2
                      : r.status == '진행중'
                          ? LucideIcons.shieldAlert
                          : LucideIcons.info,
                  size: 14,
                  color: r.status == '픽업완료'
                      ? const Color(0xFF10B981)
                      : r.status == '진행중'
                          ? AppColors.primary
                          : Colors.grey[600],
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    r.status == '진행중'
                        ? '노쇼 보증금 ${r.formattedDeposit}원 가결제 홀드중 (방문 시 자동 취소)'
                        : r.status == '픽업완료'
                            ? '가결제 100% 자동 취소 완료 (0원 청구)'
                            : r.paymentStatusLabel,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: r.status == '픽업완료'
                          ? const Color(0xFF10B981)
                          : r.status == '진행중'
                              ? AppColors.primary
                              : Colors.grey[600],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (r.status == '진행중') ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('예약 취소'),
                      content: const Text(
                          '예약을 취소하시면 노쇼 방지 가결제(보증금)는 즉시 해제/취소됩니다.\n정말 취소하시겠습니까?'),
                      actions: [
                        TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('아니요')),
                        TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('취소하기',
                                style: TextStyle(color: Colors.red))),
                      ],
                    ),
                  );
                  if (confirmed == true && context.mounted) {
                    context.read<ReservationProvider>().cancel(r.id);
                  }
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.grey,
                  side: BorderSide(color: Colors.grey.withValues(alpha: 0.3)),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('예약 취소 (가결제 즉시 해제)',
                    style: TextStyle(fontSize: 13)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
