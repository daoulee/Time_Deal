import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/reservation.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/services/device_id.dart';
import '../../core/theme/app_colors.dart';
import 'deal_create_screen.dart';
import 'merchant_orders_screen.dart';

class MerchantHomeScreen extends StatelessWidget {
  const MerchantHomeScreen({super.key});

  static const _mockNames = ['김동네', '이성수', '박뚝섬', '최서울', '정한강', '강마포'];

  String _mockCustomerName(String reservationId) {
    final hash = reservationId.codeUnits.fold(0, (a, b) => a + b);
    return _mockNames[hash % _mockNames.length];
  }

  String _fmt(int price) => price
      .toString()
      .replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');

  @override
  Widget build(BuildContext context) {
    final rp = context.watch<ReservationProvider>();
    final dp = context.watch<DealProvider>();

    final activeCount = rp.merchantByStatus('진행중').length;
    final completedCount = rp.merchantByStatus('픽업완료').length;
    final totalRevenue = rp
        .merchantByStatus('픽업완료')
        .fold(0, (sum, r) => sum + r.deal.discountedPrice);

    final activeDeals = dp.deals
        .where((d) =>
            d.expiresAt.isAfter(DateTime.now()) &&
            d.storeId == DeviceId.value)
        .toList();

    final recentOrders = rp.merchantAll.take(3).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('사장님 대시보드', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.clipboardList),
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const MerchantOrdersScreen())),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 가게 배너
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF6B35), AppColors.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.store, size: 36, color: Colors.white),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('성수 베이커리',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w700)),
                      SizedBox(height: 4),
                      Text('베이커리 · 성수동 2가',
                          style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                ),
                // 딜 등록 바로가기
                GestureDetector(
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const DealCreateScreen())),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(LucideIcons.plus, size: 14, color: Colors.white),
                        const SizedBox(width: 4),
                        Text('딜 올리기',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 실시간 통계 카드
          Row(children: [
            _DashCard(
              label: '진행중 예약',
              value: '$activeCount건',
              icon: LucideIcons.clipboardList,
              highlight: activeCount > 0,
            ),
            const SizedBox(width: 10),
            _DashCard(
              label: '픽업 완료',
              value: '$completedCount건',
              icon: LucideIcons.checkCircle2,
            ),
            const SizedBox(width: 10),
            _DashCard(
              label: '누적 매출',
              value: '${_fmt(totalRevenue)}원',
              icon: LucideIcons.banknote,
            ),
          ]),
          const SizedBox(height: 20),

          // 진행중인 딜
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                activeDeals.isEmpty ? '진행중인 딜' : '진행중인 딜 ${activeDeals.length}개',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              TextButton(
                onPressed: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const MerchantOrdersScreen())),
                child: const Text('딜 관리'),
              ),
            ],
          ),
          if (activeDeals.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
              ),
              child: Center(
                child: Column(
                  children: [
                    Icon(LucideIcons.tag, size: 32, color: Colors.grey[300]),
                    const SizedBox(height: 8),
                    Text('진행중인 딜이 없어요',
                        style: TextStyle(fontSize: 13, color: Colors.grey[400])),
                    const SizedBox(height: 4),
                    Text('딜 올리기 버튼을 눌러 등록해보세요',
                        style: TextStyle(fontSize: 12, color: Colors.grey[300])),
                  ],
                ),
              ),
            )
          else
            ...activeDeals.map((deal) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                color: AppColors.primary.withValues(alpha: 0.04),
              ),
              child: Row(
                children: [
                  Icon(deal.icon, size: 26, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(deal.title,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text(
                          '${_fmt(deal.discountedPrice)}원 · ${deal.remainingStock}/${deal.totalStock}개 남음',
                          style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('진행중',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            )),
          const SizedBox(height: 20),

          // 최근 주문
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('최근 주문', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              if (rp.merchantAll.isNotEmpty)
                Text('총 ${rp.merchantAll.length}건',
                    style: TextStyle(fontSize: 12, color: Colors.grey[400])),
            ],
          ),
          const SizedBox(height: 8),
          if (recentOrders.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text('아직 주문이 없어요',
                    style: TextStyle(fontSize: 13, color: Colors.grey[400])),
              ),
            )
          else
            ...recentOrders.map((r) => _ReservationOrderItem(
              reservation: r,
              customerName: _mockCustomerName(r.id),
            )),
          const SizedBox(height: 80),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
            context, MaterialPageRoute(builder: (_) => const DealCreateScreen())),
        backgroundColor: AppColors.primary,
        icon: Icon(LucideIcons.plus, color: Colors.white),
        label: const Text('딜 올리기',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _DashCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final bool highlight;

  const _DashCard({
    required this.label,
    required this.value,
    required this.icon,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: highlight
                ? AppColors.primary.withValues(alpha: 0.4)
                : Colors.grey.withValues(alpha: 0.15),
          ),
          color: highlight ? AppColors.primary.withValues(alpha: 0.04) : null,
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: highlight ? AppColors.primary : Colors.grey[400]),
            const SizedBox(height: 6),
            Text(value,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: highlight ? AppColors.primary : null)),
            Text(label, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
          ],
        ),
      ),
    );
  }
}

class _ReservationOrderItem extends StatelessWidget {
  final Reservation reservation;
  final String customerName;

  const _ReservationOrderItem({
    required this.reservation,
    required this.customerName,
  });

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    final isActive = r.status == '진행중';
    final isDone = r.status == '픽업완료';

    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        radius: 18,
        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
        child: Text(customerName[0],
            style: const TextStyle(
                color: AppColors.primary, fontWeight: FontWeight.w700)),
      ),
      title: Text('$customerName · ${r.deal.title}',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text(r.formattedDate,
          style: TextStyle(fontSize: 12, color: Colors.grey[500])),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: isDone
              ? Colors.grey.withValues(alpha: 0.12)
              : isActive
                  ? AppColors.primary.withValues(alpha: 0.1)
                  : Colors.grey.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(r.status,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDone
                  ? Colors.grey
                  : isActive
                      ? AppColors.primary
                      : Colors.grey[400],
            )),
      ),
    );
  }
}
