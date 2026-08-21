import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/models/reservation.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/status_colors.dart';

// [Antigravity | 2026-08-21] 수정범위: PickupTicketScreen — 스윙 방식 노쇼 가결제 연동 스마트 픽업 티켓, 길찾기/전화, 실시간 카운트다운 화면
class PickupTicketScreen extends StatefulWidget {
  final Reservation reservation;

  const PickupTicketScreen({super.key, required this.reservation});

  @override
  State<PickupTicketScreen> createState() => _PickupTicketScreenState();
}

class _PickupTicketScreenState extends State<PickupTicketScreen> {
  Timer? _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _calcRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _calcRemaining());
  }

  void _calcRemaining() {
    final diff = widget.reservation.deal.expiresAt.difference(DateTime.now());
    if (mounted) {
      setState(() {
        _remaining = diff.isNegative ? Duration.zero : diff;
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    if (d.inSeconds <= 0) return '00:00:00 (마감됨)';
    final hours = d.inHours.toString().padLeft(2, '0');
    final mins = (d.inMinutes % 60).toString().padLeft(2, '0');
    final secs = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$mins:$secs';
  }

  String get _ticketCode {
    final raw = widget.reservation.id.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
    if (raw.length >= 6) {
      return 'FD-${raw.substring(raw.length - 6)}';
    }
    return 'FD-892104';
  }

  Future<void> _launchMap(double lat, double lng, String name) async {
    AppHaptics.selection();
    final appleUrl = Uri.parse('https://maps.apple.com/?daddr=$lat,$lng&q=${Uri.encodeComponent(name)}');
    final googleUrl = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');

    if (await canLaunchUrl(appleUrl)) {
      await launchUrl(appleUrl, mode: LaunchMode.externalApplication);
    } else if (await canLaunchUrl(googleUrl)) {
      await launchUrl(googleUrl, mode: LaunchMode.externalApplication);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('지도 앱을 열 수 없어요'), behavior: SnackBarBehavior.floating),
      );
    }
  }

  Future<void> _makeCall(String phone) async {
    AppHaptics.selection();
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('전화 연결을 시작할 수 없어요'), behavior: SnackBarBehavior.floating),
      );
    }
  }

  void _copyTicketCode() {
    Clipboard.setData(ClipboardData(text: _ticketCode));
    AppHaptics.success();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('예약번호($_ticketCode)가 클립보드에 복사되었어요'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final rp = context.watch<ReservationProvider>();
    
    // Live reservation lookup
    Reservation liveReservation = widget.reservation;
    for (final r in rp.all) {
      if (r.id == widget.reservation.id) {
        liveReservation = r;
        break;
      }
    }

    final deal = liveReservation.deal;
    final isPending = liveReservation.status == '진행중';
    final isDone = liveReservation.status == '픽업완료';

    return Scaffold(
      appBar: AppBar(
        title: const Text('스마트 픽업 티켓', style: TextStyle(fontWeight: FontWeight.w800)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(LucideIcons.copy, size: 19),
            tooltip: '예약번호 복사',
            onPressed: _copyTicketCode,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 96),
        children: [
          // 1. 프리미엄 영수증 / 픽업 티켓 카드
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 티켓 상단 헤더
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: StatusColors.background(liveReservation.status),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          liveReservation.status,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: StatusColors.foreground(liveReservation.status),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        liveReservation.formattedDate,
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),

                // 상품 및 매장 정보 요약
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: deal.imageUrl.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: deal.imageUrl,
                                width: 68,
                                height: 68,
                                fit: BoxFit.cover,
                                memCacheWidth: 200,
                                memCacheHeight: 200,
                              )
                            : Container(
                                width: 68,
                                height: 68,
                                color: AppColors.primary.withValues(alpha: 0.1),
                                child: Icon(deal.icon, color: AppColors.primary, size: 28),
                              ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              deal.storeName,
                              style: TextStyle(fontSize: 13, color: Colors.grey[500], fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              deal.title,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Text(
                                  '${deal.discountPercent}%',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.discountRed,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${Formatters.price(deal.discountedPrice)}원',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 티켓 펀칭 절취선 디자인
                _TicketPerforationDivider(isDark: isDark),

                // 바코드 및 예약 번호 영역
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                  child: Column(
                    children: [
                      // 가상 바코드 그래픽
                      _VirtualBarcode(isDark: isDark),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '예약번호: $_ticketCode',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(width: 6),
                          GestureDetector(
                            onTap: _copyTicketCode,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                '복사',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                              ),
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
          const SizedBox(height: 14),

          // 2. 픽업 마감 카운트다운 타이머 카드
          if (isPending)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _remaining.inMinutes < 30
                    ? Colors.red.withValues(alpha: 0.08)
                    : AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _remaining.inMinutes < 30
                      ? Colors.red.withValues(alpha: 0.3)
                      : AppColors.primary.withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    LucideIcons.alarmClock,
                    color: _remaining.inMinutes < 30 ? Colors.red : AppColors.primary,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '픽업 마감까지 남은 시간',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _remaining.inMinutes < 30 ? Colors.red : AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _formatDuration(_remaining),
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                            color: _remaining.inMinutes < 30 ? Colors.red : null,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 14),

          // 3. 스윙 방식 노쇼 방지 가결제 안심 배너
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDone
                  ? const Color(0xFF10B981).withValues(alpha: 0.08)
                  : const Color(0xFF3B82F6).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDone
                    ? const Color(0xFF10B981).withValues(alpha: 0.25)
                    : const Color(0xFF3B82F6).withValues(alpha: 0.25),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      isDone ? LucideIcons.checkCircle2 : LucideIcons.shieldCheck,
                      size: 18,
                      color: isDone ? const Color(0xFF10B981) : const Color(0xFF3B82F6),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isDone ? '가결제 100% 자동 취소 완료' : '노쇼 방지 보증금 가결제 상태',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDone ? const Color(0xFF10B981) : const Color(0xFF3B82F6),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  isDone
                      ? '매장에서 현장 결제가 확인되어, 처음에 잡혔던 노쇼 보증금(${liveReservation.formattedDeposit}원)은 0원으로 즉시 자동 취소/해제되었습니다.'
                      : '노쇼 방지 보증금(${liveReservation.formattedDeposit}원, ${liveReservation.paymentMethod})이 가결제(Hold)되어 있습니다. 매장 방문 픽업 시 100% 자동 취소됩니다.',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[300] : Colors.grey[700],
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 4. 매장 위치 및 빠른 연결 액션 2종 (길찾기, 전화걸기)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(LucideIcons.mapPin, size: 16, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text(
                      deal.storeName,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                    ),
                    const Spacer(),
                    if (deal.distanceKm > 0)
                      Text(
                        deal.distanceKm < 1
                            ? '${(deal.distanceKm * 1000).round()}m 거리'
                            : '${deal.distanceKm.toStringAsFixed(1)}km 거리',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  deal.neighborhood != null
                      ? '부산시 해운대구 ${deal.neighborhood}'
                      : '매장 주소는 픽업 안내를 참고해 주세요',
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          final lat = deal.storeLat ?? 35.1631;
                          final lng = deal.storeLng ?? 129.1636;
                          _launchMap(lat, lng, deal.storeName);
                        },
                        icon: Icon(LucideIcons.navigation, size: 15),
                        label: const Text('길찾기', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _makeCall('051-740-0000'),
                        icon: Icon(LucideIcons.phone, size: 15),
                        label: const Text('매장 전화', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.grey[700],
                          side: BorderSide(color: Colors.grey.withValues(alpha: 0.3)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 5. 현장 수령 3초 체크리스트
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withValues(alpha: 0.03) : Colors.black.withValues(alpha: 0.02),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '현장 수령 안내 가이드',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                _buildGuideStep('1', '매장에 도착하여 사장님께 이 스마트 티켓 화면을 보여주세요.'),
                const SizedBox(height: 8),
                _buildGuideStep('2', '매장 포스기에서 카드/현금/동백전 등 원하시는 수단으로 결제합니다.'),
                const SizedBox(height: 8),
                _buildGuideStep('3', '사장님이 픽업 확인을 누르면 노쇼 가결제는 즉시 100% 자동 취소됩니다.'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 6. 하단 예약 취소 버튼 (진행중일 때만)
          if (isPending)
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('예약 취소'),
                      content: const Text(
                        '예약을 취소하시면 노쇼 방지 가결제(보증금)는 즉시 자동 해제됩니다.\n정말 취소하시겠습니까?',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('아니요'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('취소하기', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  );

                  if (confirmed == true && context.mounted) {
                    AppHaptics.selection();
                    await context.read<ReservationProvider>().cancel(liveReservation.id);
                    if (!context.mounted) return;
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('예약이 취소되었으며, 가결제가 즉시 해제되었습니다'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
                icon: Icon(LucideIcons.xCircle, size: 16, color: Colors.grey),
                label: const Text(
                  '예약 취소 (가결제 즉시 해제)',
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildGuideStep(String step, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              step,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 12, height: 1.35),
          ),
        ),
      ],
    );
  }
}

// 티켓 절취선 위젯 (좌우 반원 홈 + 점선)
class _TicketPerforationDivider extends StatelessWidget {
  final bool isDark;
  const _TicketPerforationDivider({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final bgColor = Theme.of(context).scaffoldBackgroundColor;
    return SizedBox(
      height: 20,
      child: Stack(
        alignment: Alignment.center,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              const dashWidth = 4.0;
              const dashSpace = 4.0;
              final dashCount = (width / (dashWidth + dashSpace)).floor();
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(dashCount, (_) {
                  return Container(
                    width: dashWidth,
                    height: 1.2,
                    color: Colors.grey.withValues(alpha: isDark ? 0.3 : 0.2),
                  );
                }),
              );
            },
          ),
          Positioned(
            left: -10,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            right: -10,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// 가상 바코드 위젯 (정밀 스트라이프)
class _VirtualBarcode extends StatelessWidget {
  final bool isDark;
  const _VirtualBarcode({required this.isDark});

  static const List<double> _barWidths = [
    2, 4, 1, 3, 5, 2, 1, 4, 2, 6, 1, 3, 2, 5, 1, 4, 3, 2, 6, 2, 1, 4, 3, 2, 5, 1, 3, 2, 4, 1, 5, 2, 3
  ];

  @override
  Widget build(BuildContext context) {
    final barColor = isDark ? Colors.white.withValues(alpha: 0.85) : Colors.black.withValues(alpha: 0.85);

    return Container(
      height: 54,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _barWidths.map((w) {
          return Container(
            width: w,
            margin: const EdgeInsets.symmetric(horizontal: 1.5),
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(1),
            ),
          );
        }).toList(),
      ),
    );
  }
}
