import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/reservation.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/mock_utils.dart';
import '../../core/utils/status_colors.dart';
import '../../widgets/sliding_segmented_control.dart';

// [Antigravity | 2026-08-23] 수정범위: MerchantOrdersScreen — 상용 비즈니스 런칭 기준의 성숙한 카피라이팅 & 미니멀 클린 주문 관리 UI
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121316) : const Color(0xFFF7F8FA),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF121316) : Colors.white,
        elevation: 0,
        title: const Text(
          '주문 및 예약 내역',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        centerTitle: true,
        bottom: SlidingPillTabBar(
          controller: _tab,
          tabs: const ['전체 내역', '접수 및 진행', '정산 완료'],
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
              _OrderList(reservations: all, tabType: '전체', isDark: isDark),
              _OrderList(reservations: pending, tabType: '진행중', isDark: isDark),
              _OrderList(reservations: done, tabType: '픽업완료', isDark: isDark),
            ],
          );
        },
      ),
    );
  }
}

class _OrderList extends StatelessWidget {
  final List<Reservation> reservations;
  final String tabType;
  final bool isDark;

  const _OrderList({
    required this.reservations,
    required this.tabType,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    if (reservations.isEmpty) {
      return RefreshIndicator.adaptive(
        color: AppColors.primary,
        onRefresh: () async {
          AppHaptics.selection();
          await context.read<ReservationProvider>().refresh();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(height: MediaQuery.of(context).size.height * 0.22),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF1E1F25)
                          : const Color(0xFFF1F3F5),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      LucideIcons.clipboardList,
                      size: 32,
                      color: isDark ? Colors.grey[400] : Colors.grey[500],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    tabType == '진행중'
                        ? '접수 대기 중인 픽업 주문이 없습니다'
                        : (tabType == '픽업완료'
                            ? '정산 및 픽업 완료된 이력이 없습니다'
                            : '등록된 주문 내역이 없습니다'),
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white70 : const Color(0xFF212529),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '고객이 타임딜 상품을 예약하면 실시간으로 내역이 갱신됩니다',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey[500] : Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final totalAmount = reservations.fold<int>(
      0,
      (sum, r) => sum + r.deal.discountedPrice,
    );

    return RefreshIndicator.adaptive(
      color: AppColors.primary,
      onRefresh: () async {
        AppHaptics.selection();
        await context.read<ReservationProvider>().refresh();
      },
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: reservations.length + 1,
        itemBuilder: (_, i) {
          if (i == 0) {
            // 상단 주문 수 & 금액 요약 바
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF1B1C22)
                    : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.05),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        LucideIcons.receipt,
                        size: 15,
                        color: isDark ? Colors.grey[400] : const Color(0xFF495057),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '총 ${reservations.length}건',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark ? Colors.white : const Color(0xFF212529),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '합계 ${Formatters.price(totalAmount)}원',
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            );
          }

          final r = reservations[i - 1];
          return _OrderCard(
            reservation: r,
            customerName: mockCustomerName(r.userId),
            isDark: isDark,
          );
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Reservation reservation;
  final String customerName;
  final bool isDark;

  const _OrderCard({
    required this.reservation,
    required this.customerName,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    final isPending = r.status == '진행중';
    final isDone = r.status == '픽업완료';

    final cardBg = isDark ? const Color(0xFF1B1C22) : Colors.white;
    final borderColor = isPending
        ? AppColors.primary.withValues(alpha: isDark ? 0.35 : 0.25)
        : (isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.black.withValues(alpha: 0.06));

    final shortTicketId = r.id.length > 6
        ? r.id.substring(r.id.length - 6).toUpperCase()
        : r.id.toUpperCase();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. 헤더: 티켓 번호 + 고객명 + 상태 뱃지
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF25262D)
                      : const Color(0xFFF1F3F5),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '#$shortTicketId',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white70 : const Color(0xFF495057),
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                radius: 13,
                backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                child: Text(
                  customerName.isNotEmpty ? customerName[0] : '고',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                customerName,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF212529),
                ),
              ),
              const Spacer(),
              _StatusBadge(status: r.status),
            ],
          ),
          const SizedBox(height: 12),

          // 2. 딜 상품 정보 카드
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xFF22232A)
                  : const Color(0xFFF8F9FA),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Icon(r.deal.icon, size: 18, color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        r.deal.title,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? Colors.white : const Color(0xFF212529),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            '${Formatters.price(r.deal.discountedPrice)}원',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${Formatters.price(r.deal.originalPrice)}원',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[500],
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 3. 주문 일시 & 노쇼 보증금 확보 뱃지
          Row(
            children: [
              Icon(LucideIcons.clock, size: 12.5, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text(
                r.formattedDate,
                style: TextStyle(
                  fontSize: 11.5,
                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isPending
                      ? const Color(0xFF10B981).withValues(alpha: 0.10)
                      : (isDark ? const Color(0xFF25262D) : Colors.grey.withValues(alpha: 0.10)),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isPending ? LucideIcons.shieldCheck : LucideIcons.checkCircle,
                      size: 12,
                      color: isPending
                          ? const Color(0xFF10B981)
                          : (isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isPending
                          ? '노쇼 방지 보증금 ${r.formattedDeposit}원 승인 확보'
                          : '노쇼 가결제 자동 해제 완료',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isPending
                            ? const Color(0xFF10B981)
                            : (isDark ? Colors.grey[400] : Colors.grey[600]),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // 4. 사장님 액션 버튼군 (진행 중일 때)
          if (isPending) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 1,
                  child: OutlinedButton(
                    onPressed: () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('노쇼 위약금 청구'),
                          content: Text(
                            '$customerName 고객님이 방문 마감시간까지 내방하지 않으셨나요?\n\n노쇼 확정 시 사전 확보된 보증금(${r.formattedDeposit}원)이 사장님 손실 보전 위약금으로 즉시 청구 결제 처리됩니다.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context, false),
                              child: const Text('취소'),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(context, true),
                              child: const Text(
                                '노쇼 확정 및 청구',
                                style: TextStyle(
                                  color: Colors.red,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                      if (confirmed == true && context.mounted) {
                        AppHaptics.light();
                        await context.read<ReservationProvider>().markNoShow(r.id);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('$customerName 고객님 노쇼 위약금 청구 처리 완료'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red[400],
                      side: BorderSide(
                        color: Colors.red.withValues(alpha: 0.35),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    child: const Text(
                      '노쇼 위약금 청구',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      AppHaptics.success();
                      await context.read<ReservationProvider>().complete(r.id);
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('$customerName 고객님의 현장 수납 및 픽업이 정상 완료되었습니다'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    icon: Icon(LucideIcons.checkCheck, size: 16),
                    label: const Text(
                      '현장 수납 및 픽업 완료',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
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
                  Icon(
                    LucideIcons.checkCircle2,
                    size: 13,
                    color: const Color(0xFF10B981),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '픽업 완료됨 · 노쇼 가결제 자동 취소 (현장 수납 완료)',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        color: StatusColors.background(status),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: StatusColors.foreground(status),
        ),
      ),
    );
  }
}
