import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/reservation.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../core/utils/status_colors.dart';
import '../reservation/pickup_ticket_screen.dart';

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
    final rp = context.watch<ReservationProvider>();
    final items = rp.byStatus(status);

    return RefreshIndicator.adaptive(
      color: AppColors.primary,
      onRefresh: () async {
        AppHaptics.selection();
        await rp.refresh();
      },
      child: items.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.clipboardList, size: 48, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      Text('$status 예약이 없어요',
                          style: TextStyle(fontSize: 14, color: Colors.grey[400])),
                    ],
                  ),
                ),
              ],
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _ReservationCard(reservation: items[i]),
            ),
    );
  }
}

class _ReservationCard extends StatelessWidget {
  final Reservation reservation;
  const _ReservationCard({required this.reservation});

  @override
  Widget build(BuildContext context) {
    final r = reservation;

    return Material(
      color: Theme.of(context).cardTheme.color,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          AppHaptics.selection();
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PickupTicketScreen(reservation: r),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
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
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w700)),
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
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary)),
                  const Spacer(),
                  Icon(LucideIcons.clock, size: 13, color: Colors.grey[400]),
                  const SizedBox(width: 4),
                  Text(r.formattedDate,
                      style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ],
              ),
              const SizedBox(height: 10),

              // [Antigravity | 2026-08-21] 수정범위: _ReservationCard — 스윙 방식 노쇼 방지 가결제(Hold) 상태 배너
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
              const SizedBox(height: 12),

              // 스마트 픽업 티켓 열기 버튼
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(LucideIcons.ticket, size: 15, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text(
                      '스마트 픽업 티켓 & 길찾기 보기',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(LucideIcons.chevronRight, size: 14, color: AppColors.primary),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
