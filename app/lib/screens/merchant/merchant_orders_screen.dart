import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/reservation.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/mock_utils.dart';
import '../../core/utils/status_colors.dart';

class MerchantOrdersScreen extends StatefulWidget {
  const MerchantOrdersScreen({super.key});

  @override
  State<MerchantOrdersScreen> createState() => _MerchantOrdersScreenState();
}

class _MerchantOrdersScreenState extends State<MerchantOrdersScreen>
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
        title: const Text('딜 관리', style: TextStyle(fontWeight: FontWeight.w800)),
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppColors.primary,
          dividerColor: Colors.transparent,
          tabs: const [
            Tab(text: '전체'),
            Tab(text: '진행중'),
            Tab(text: '픽업완료'),
          ],
        ),
        // [Claude | 2026-08-21] 수정범위: TabBar dividerColor 추가 — M3 기본 전체폭 구분선(검은 줄) 제거
      ),
      body: Consumer<ReservationProvider>(
        builder: (context, rp, _) {
          final all = rp.merchantAll;
          final pending = rp.merchantByStatus('진행중');
          final done = rp.merchantByStatus('픽업완료');

          return TabBarView(
            controller: _tab,
            children: [
              _OrderList(reservations: all),
              _OrderList(reservations: pending),
              _OrderList(reservations: done),
            ],
          );
        },
      ),
    );
  }
}

class _OrderList extends StatelessWidget {
  final List<Reservation> reservations;
  const _OrderList({required this.reservations});

  @override
  Widget build(BuildContext context) {
    if (reservations.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.clipboardX, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text('주문이 없어요',
                style: TextStyle(fontSize: 14, color: Colors.grey[400])),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: reservations.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final r = reservations[i];
        return _OrderCard(
          reservation: r,
          customerName: mockCustomerName(r.userId),
        );
      },
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Reservation reservation;
  final String customerName;

  const _OrderCard({required this.reservation, required this.customerName});

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    final isPending = r.status == '진행중';
    final isDone = r.status == '픽업완료';

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
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                child: Text(customerName[0],
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 14)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(customerName,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700)),
                    Text(r.deal.title,
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              _StatusBadge(status: r.status),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(LucideIcons.clock, size: 13, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text(r.formattedDate,
                  style: TextStyle(fontSize: 12, color: Colors.grey[400])),
              const Spacer(),
              Icon(LucideIcons.tag, size: 13, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text('${Formatters.price(r.deal.discountedPrice)}원',
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 10),

          // [Antigravity | 2026-08-21] 수정범위: _OrderCard — 사장님용 노쇼 보증금 확보 상태 뱃지 및 현장결제 확인 안내
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isPending
                  ? const Color(0xFF10B981).withValues(alpha: 0.08)
                  : Colors.grey.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  isPending ? LucideIcons.shieldCheck : LucideIcons.checkCircle2,
                  size: 13,
                  color: isPending ? const Color(0xFF10B981) : Colors.grey[500],
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    isPending
                        ? '노쇼 보증금 ${r.formattedDeposit}원 확보됨 (${r.paymentMethod})'
                        : r.paymentStatusLabel,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isPending ? const Color(0xFF10B981) : Colors.grey[600],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (isPending) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('노쇼 위약금 처리'),
                          content: Text(
                              '$customerName 손님이 마감시간까지 방문하지 않았나요?\n노쇼 처리 시 보증금(${r.formattedDeposit}원)이 사장님 손실 보전 위약금으로 결제 청구됩니다.'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('취소')),
                            TextButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('노쇼 확정',
                                    style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (confirmed == true && context.mounted) {
                        HapticFeedback.heavyImpact();
                        await context.read<ReservationProvider>().markNoShow(r.id);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('$customerName 노쇼 위약금 처리 완료'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red[400],
                      side: BorderSide(color: Colors.red.withValues(alpha: 0.3)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('노쇼 처리', style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () async {
                      HapticFeedback.mediumImpact();
                      await context.read<ReservationProvider>().complete(r.id);
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('$customerName 픽업 완료! (노쇼 가결제 자동 취소됨)'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('현장결제 & 픽업 확인',
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ],
          if (isDone)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Icon(LucideIcons.checkCircle2,
                      size: 14, color: Colors.grey[400]),
                  const SizedBox(width: 4),
                  Text('픽업 완료 · 가결제 자동 취소됨',
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey[400])),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: StatusColors.background(status),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: StatusColors.foreground(status),
        ),
      ),
    );
  }
}
