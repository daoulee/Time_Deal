import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/reservation.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';

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
          tabs: const [
            Tab(text: '전체'),
            Tab(text: '진행중'),
            Tab(text: '픽업완료'),
          ],
        ),
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

  static const _names = ['김동네', '이성수', '박뚝섬', '최서울', '정한강', '강마포', '윤뚝섬', '임성수'];

  static String _customerName(String userId) {
    if (userId.isEmpty) return '고객';
    final hash = userId.codeUnits.fold(0, (a, b) => a + b);
    return _names[hash % _names.length];
  }

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
          customerName: _customerName(r.userId),
        );
      },
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Reservation reservation;
  final String customerName;

  const _OrderCard({required this.reservation, required this.customerName});

  String _fmt(int price) => price
      .toString()
      .replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');

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
              Text('${_fmt(r.deal.discountedPrice)}원',
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary)),
            ],
          ),
          if (isPending) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      context.read<ReservationProvider>().cancel(r.id);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey,
                      side: BorderSide(color: Colors.grey.withValues(alpha: 0.3)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('취소', style: TextStyle(fontSize: 13)),
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
                          content: Text('$customerName 픽업 완료 처리됐어요'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('픽업 확인',
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
                  Text('픽업 완료',
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
    final isDone = status == '픽업완료';
    final isCancelled = status == '취소';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isDone
            ? Colors.grey.withValues(alpha: 0.12)
            : isCancelled
                ? Colors.red.withValues(alpha: 0.1)
                : AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: isDone
              ? Colors.grey
              : isCancelled
                  ? Colors.red
                  : AppColors.primary,
        ),
      ),
    );
  }
}
