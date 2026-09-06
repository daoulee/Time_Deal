import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/deal.dart';
import '../../core/models/reservation.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/providers/profile_provider.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/services/device_id.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/mock_utils.dart';
import '../../core/utils/status_colors.dart';
import '../../widgets/sliding_segmented_control.dart';
import 'deal_create_screen.dart';
import '../role_select/role_select_screen.dart';
import 'merchant_orders_screen.dart';

// [Antigravity | 2026-08-23] 수정범위: MerchantHomeScreen — 상용 비즈니스 런칭 기준의 성숙한 카피라이팅 & 미니멀 클린 UI 리팩토링
class MerchantHomeScreen extends StatefulWidget {
  const MerchantHomeScreen({super.key});

  @override
  State<MerchantHomeScreen> createState() => _MerchantHomeScreenState();
}

class _MerchantHomeScreenState extends State<MerchantHomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _entranceCtrl;
  late Animation<Offset> _bannerSlide;
  late Animation<double> _bannerFade;
  late Animation<double> _statsFade;
  late Animation<double> _statsScale;
  late Animation<double> _bodyFade;
  late Animation<Offset> _bodySlide;

  int _dealFilterIndex = 0; // 0: 진행중, 1: 마감/완판

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReservationProvider>().refresh();
      context.read<DealProvider>().refresh();
    });

    _entranceCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );
    _bannerSlide = Tween<Offset>(
      begin: const Offset(0, -0.08),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOutCubic),
      ),
    );
    _bannerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOut),
      ),
    );
    _statsFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.15, 0.70, curve: Curves.easeOut),
      ),
    );
    _statsScale = Tween<double>(begin: 0.96, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.15, 0.75, curve: Curves.easeOutBack),
      ),
    );
    _bodyFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.25, 0.90, curve: Curves.easeOut),
      ),
    );
    _bodySlide = Tween<Offset>(
      begin: const Offset(0, 0.04),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.25, 0.90, curve: Curves.easeOutCubic),
      ),
    );
    _entranceCtrl.forward();
  }

  @override
  void dispose() {
    _entranceCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rp = context.watch<ReservationProvider>();
    final dp = context.watch<DealProvider>();
    final profile = context.watch<ProfileProvider>();
    final location = context.watch<LocationProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final activeCount = rp.merchantByStatus('진행중').length;
    final completedCount = rp.merchantByStatus('픽업완료').length;
    final totalRevenue = rp
        .merchantByStatus('픽업완료')
        .fold(0, (sum, r) => sum + r.deal.discountedPrice);

    final activeDeals = dp.deals
        .where((d) =>
            !d.isExpired &&
            d.remainingStock > 0 &&
            d.storeId == DeviceId.value)
        .toList();

    final soldOutDeals = dp.deals
        .where((d) =>
            (d.isExpired || d.remainingStock <= 0) &&
            d.storeId == DeviceId.value)
        .toList();

    final recentOrders = rp.merchantAll.take(4).toList();

    final cardBg = isDark ? const Color(0xFF1B1C22) : Colors.white;
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.06);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121316) : const Color(0xFFF7F8FA),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF121316) : Colors.white,
        elevation: 0,
        leadingWidth: 110,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: Center(
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () {
                AppHaptics.selection();
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const RoleSelectScreen()),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF22232A)
                      : const Color(0xFFF1F3F5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : Colors.black.withValues(alpha: 0.06),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      LucideIcons.arrowLeft,
                      size: 13,
                      color: isDark ? Colors.white70 : const Color(0xFF495057),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '모드 전환',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white70 : const Color(0xFF495057),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        title: const Text(
          '사장님 대시보드',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        centerTitle: true,
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: Icon(
                  LucideIcons.clipboardList,
                  size: 21,
                  color: isDark ? Colors.white70 : const Color(0xFF343A40),
                ),
                tooltip: '주문 관리',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MerchantOrdersScreen()),
                ),
              ),
              if (activeCount > 0)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$activeCount',
                      style: const TextStyle(
                        fontSize: 9,
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: RefreshIndicator.adaptive(
        color: AppColors.primary,
        onRefresh: () async {
          AppHaptics.selection();
          await Future.wait([
            context.read<ReservationProvider>().refresh(),
            context.read<DealProvider>().refresh(),
          ]);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
          children: [
            // 1. 단정하고 성숙한 매장 정보 카드
            SlideTransition(
              position: _bannerSlide,
              child: FadeTransition(
                opacity: _bannerFade,
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: borderColor),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(
                          alpha: isDark ? 0.20 : 0.03,
                        ),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(
                                alpha: isDark ? 0.12 : 0.08,
                              ),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Center(
                              child: Icon(
                                LucideIcons.store,
                                size: 22,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  profile.name.isNotEmpty
                                      ? '${profile.name} 매장'
                                      : '우리 동네 매장',
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.3,
                                    color: isDark ? Colors.white : const Color(0xFF212529),
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    Icon(
                                      LucideIcons.mapPin,
                                      size: 12,
                                      color: isDark ? Colors.grey[400] : Colors.grey[500],
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      location.neighborhood.isNotEmpty
                                          ? '${location.neighborhood} · 반경 3km 내 잠재 고객 노출 중'
                                          : '위치 확인 중...',
                                      style: TextStyle(
                                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 9,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF23242B)
                              : const Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.05)
                                : Colors.black.withValues(alpha: 0.04),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    color: activeDeals.isNotEmpty
                                        ? const Color(0xFF10B981)
                                        : Colors.grey[400],
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  activeDeals.isNotEmpty
                                      ? '현재 타임딜 활성화 중 (${activeDeals.length}건)'
                                      : '진행 중인 타임딜이 없습니다',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark
                                        ? Colors.white70
                                        : const Color(0xFF495057),
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              activeDeals.isNotEmpty ? '실시간 판매 중' : '대기 중',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: activeDeals.isNotEmpty
                                    ? const Color(0xFF10B981)
                                    : Colors.grey[400],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // 2. 오늘의 실시간 요약 메트릭 3종
            ScaleTransition(
              scale: _statsScale,
              child: FadeTransition(
                opacity: _statsFade,
                child: Row(
                  children: [
                    _MerchantMetricCard(
                      label: '진행 중 주문',
                      value: '$activeCount건',
                      subLabel: activeCount > 0 ? '방문 및 픽업 대기' : '주문 대기',
                      icon: LucideIcons.flame,
                      iconColor: AppColors.primary,
                      highlight: activeCount > 0,
                      isDark: isDark,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const MerchantOrdersScreen(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    _MerchantMetricCard(
                      label: '픽업 완료',
                      value: '$completedCount건',
                      subLabel: '오늘 정산 완료',
                      icon: LucideIcons.checkCircle2,
                      iconColor: const Color(0xFF10B981),
                      highlight: false,
                      isDark: isDark,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const MerchantOrdersScreen(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    _MerchantMetricCard(
                      label: '당일 매출',
                      value: '${Formatters.price(totalRevenue)}원',
                      subLabel: '정산 예정 실적',
                      icon: LucideIcons.coins,
                      iconColor: const Color(0xFFF59E0B),
                      highlight: false,
                      isDark: isDark,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const MerchantOrdersScreen(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 22),

            // 3. 타임딜 관리 섹션
            SlideTransition(
              position: _bodySlide,
              child: FadeTransition(
                opacity: _bodyFade,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Text(
                              '타임딜 관리',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF23242B)
                                    : const Color(0xFFECEEF2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '총 ${activeDeals.length + soldOutDeals.length}개',
                                style: TextStyle(
                                  color: isDark ? Colors.grey[300] : const Color(0xFF495057),
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // 슬라이딩 세그먼트 (진행 중인 딜 vs 마감 및 완판)
                    SlidingSegmentedControl(
                      segments: [
                        '진행 중인 딜 (${activeDeals.length})',
                        '마감 및 완판 (${soldOutDeals.length})',
                      ],
                      selectedIndex: _dealFilterIndex,
                      height: 40,
                      margin: EdgeInsets.zero,
                      backgroundColor: isDark
                          ? const Color(0xFF1B1C22)
                          : const Color(0xFFECEEF2),
                      borderColor: isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.05),
                      onValueChanged: (idx) {
                        setState(() => _dealFilterIndex = idx);
                      },
                    ),
                    const SizedBox(height: 14),

                    // 딜 리스트 뷰
                    if (_dealFilterIndex == 0) ...[
                      if (activeDeals.isEmpty)
                        _EmptyMerchantSection(
                          icon: LucideIcons.tag,
                          title: '현재 등록된 타임딜이 없습니다',
                          subtitle: '마감 전 잔여 재고를 등록하여 인근 고객에게 즉시 홍보하고 당일 매출을 확보해보세요.',
                          buttonText: '새 타임딜 등록하기',
                          isDark: isDark,
                          onAction: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const DealCreateScreen(),
                            ),
                          ),
                        )
                      else
                        ...activeDeals.map((deal) => _ActiveDealCard(
                              deal: deal,
                              cardBg: cardBg,
                              borderColor: borderColor,
                              isDark: isDark,
                            )),
                    ] else ...[
                      if (soldOutDeals.isEmpty)
                        _EmptyMerchantSection(
                          icon: LucideIcons.checkCheck,
                          title: '마감 및 판매 완료된 딜이 없습니다',
                          subtitle: '진행 중인 딜이 마감되거나 완판되면 이곳에서 이전 이력을 확인하실 수 있습니다.',
                          isDark: isDark,
                        )
                      else
                        ...soldOutDeals.map((deal) => _SoldOutDealCard(
                              deal: deal,
                              cardBg: cardBg,
                              borderColor: borderColor,
                              isDark: isDark,
                            )),
                    ],

                    const SizedBox(height: 22),

                    // 4. 실시간 주문 및 픽업 접수
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Text(
                              '실시간 주문 및 픽업 접수',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                              ),
                            ),
                            if (rp.merchantAll.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              Text(
                                '${rp.merchantAll.length}건',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                                ),
                              ),
                            ],
                          ],
                        ),
                        InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const MerchantOrdersScreen(),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 4,
                            ),
                            child: Row(
                              children: [
                                Text(
                                  '전체 내역',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                                  ),
                                ),
                                const SizedBox(width: 2),
                                Icon(
                                  LucideIcons.chevronRight,
                                  size: 14,
                                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    if (recentOrders.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: borderColor),
                        ),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(
                                LucideIcons.shoppingBag,
                                size: 32,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '접수 대기 중인 주문이 없습니다',
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white70 : Colors.grey[600],
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '고객이 상품을 예약하면 실시간 알림과 함께 접수 내역이 표시됩니다',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: isDark ? Colors.grey[500] : Colors.grey[400],
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ...recentOrders.map((r) => _MerchantOrderCard(
                            reservation: r,
                            customerName: mockCustomerName(r.id),
                            cardBg: cardBg,
                            borderColor: borderColor,
                            isDark: isDark,
                          )),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      // 딜이 이미 1개 이상 활성화되어 있을 때만 플로팅 등록 버튼 노출
      floatingActionButton: activeDeals.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () {
                AppHaptics.selection();
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DealCreateScreen()),
                );
              },
              backgroundColor: AppColors.primary,
              elevation: 4,
              icon: Icon(LucideIcons.plus, color: Colors.white, size: 18),
              label: const Text(
                '새 타임딜 등록',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                ),
              ),
            )
          : null,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트: 통계 카드
// ─────────────────────────────────────────────────────────────────────────────
class _MerchantMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String subLabel;
  final IconData icon;
  final Color iconColor;
  final bool highlight;
  final bool isDark;
  final VoidCallback onTap;

  const _MerchantMetricCard({
    required this.label,
    required this.value,
    required this.subLabel,
    required this.icon,
    required this.iconColor,
    required this.highlight,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isDark ? const Color(0xFF1B1C22) : Colors.white;
    final border = highlight
        ? AppColors.primary.withValues(alpha: isDark ? 0.40 : 0.35)
        : (isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.black.withValues(alpha: 0.06));

    return Expanded(
      child: GestureDetector(
        onTap: () {
          AppHaptics.selection();
          onTap();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border, width: highlight ? 1.2 : 1.0),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.03),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  Icon(icon, size: 16, color: iconColor),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.3,
                  color: highlight
                      ? AppColors.primary
                      : (isDark ? Colors.white : const Color(0xFF212529)),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                subLabel,
                style: TextStyle(
                  fontSize: 10.5,
                  color: isDark ? Colors.grey[500] : Colors.grey[400],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트: 진행 중인 딜 카드
// ─────────────────────────────────────────────────────────────────────────────
class _ActiveDealCard extends StatelessWidget {
  final Deal deal;
  final Color cardBg;
  final Color borderColor;
  final bool isDark;

  const _ActiveDealCard({
    required this.deal,
    required this.cardBg,
    required this.borderColor,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final soldRatio = (deal.totalStock > 0)
        ? ((deal.totalStock - deal.remainingStock) / deal.totalStock).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Icon(deal.icon, size: 20, color: AppColors.primary),
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
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: const Text(
                            'LIVE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF2B221E)
                                : const Color(0xFFFFF3EB),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            '${deal.discountPercent}% 할인',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      deal.title,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: isDark ? Colors.white : const Color(0xFF212529),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(LucideIcons.xCircle, size: 18, color: Colors.grey[400]),
                tooltip: '딜 조기 마감',
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('타임딜 조기 마감'),
                      content: Text(
                        '\'${deal.title}\' 타임딜을 지금 조기 마감하시겠습니까?\n마감 즉시 소비자 홈 및 지도에서 노출이 중단됩니다.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('취소'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text(
                            '마감하기',
                            style: TextStyle(
                              color: Colors.red,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                  if (confirmed == true && context.mounted) {
                    AppHaptics.light();
                    await context.read<DealProvider>().cancelDeal(deal.id);
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('\'${deal.title}\' 딜이 조기 마감되었습니다'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 가격 & 실시간 재고 바
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${Formatters.price(deal.discountedPrice)}원',
                style: const TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                ),
              ),
              Text(
                '남은 수량 ${deal.remainingStock}개 / 총 ${deal.totalStock}개',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // 실시간 판매 프로그레스 바
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: soldRatio,
              minHeight: 5,
              backgroundColor: isDark
                  ? const Color(0xFF282930)
                  : const Color(0xFFECEEF2),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트: 판매 완료된 딜 카드
// ─────────────────────────────────────────────────────────────────────────────
class _SoldOutDealCard extends StatelessWidget {
  final Deal deal;
  final Color cardBg;
  final Color borderColor;
  final bool isDark;

  const _SoldOutDealCard({
    required this.deal,
    required this.cardBg,
    required this.borderColor,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(deal.icon, size: 20, color: Colors.grey[400]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  deal.title,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    color: Colors.grey[500],
                    decoration: TextDecoration.lineThrough,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${Formatters.price(deal.discountedPrice)}원 · 판매 완료 (${deal.totalStock}개 완판)',
                  style: TextStyle(fontSize: 11.5, color: Colors.grey[400]),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF24252C) : const Color(0xFFE9ECEF),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '완판됨',
              style: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트: 실시간 주문 카드
// ─────────────────────────────────────────────────────────────────────────────
class _MerchantOrderCard extends StatelessWidget {
  final Reservation reservation;
  final String customerName;
  final Color cardBg;
  final Color borderColor;
  final bool isDark;

  const _MerchantOrderCard({
    required this.reservation,
    required this.customerName,
    required this.cardBg,
    required this.borderColor,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    final isPending = r.status == '진행중';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPending
              ? AppColors.primary.withValues(alpha: isDark ? 0.35 : 0.25)
              : borderColor,
          width: 1.0,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 17,
            backgroundColor: isPending
                ? AppColors.primary.withValues(alpha: 0.12)
                : (isDark ? const Color(0xFF24252C) : const Color(0xFFF1F3F5)),
            child: Text(
              customerName.isNotEmpty ? customerName[0] : '고',
              style: TextStyle(
                color: isPending
                    ? AppColors.primary
                    : (isDark ? Colors.white70 : Colors.grey[700]),
                fontWeight: FontWeight.w800,
                fontSize: 12.5,
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
                    Text(
                      customerName,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                        color: isDark ? Colors.white : const Color(0xFF212529),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      r.formattedDate,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.grey[500] : Colors.grey[400],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${r.deal.title} · ${Formatters.price(r.deal.discountedPrice)}원',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (isPending)
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: const Size(60, 32),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: () async {
                AppHaptics.success();
                await context
                    .read<ReservationProvider>()
                    .complete(r.id);
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('$customerName 님의 상품 수납 및 픽업이 완료 처리되었습니다'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: const Text(
                '수납 및 픽업 완료',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: StatusColors.background(r.status),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                r.status,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: StatusColors.foreground(r.status),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트: 엠프티 뷰
// ─────────────────────────────────────────────────────────────────────────────
class _EmptyMerchantSection extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? buttonText;
  final VoidCallback? onAction;
  final bool isDark;

  const _EmptyMerchantSection({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.buttonText,
    this.onAction,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1B1C22) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: Center(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF23242B)
                    : const Color(0xFFF1F3F5),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 26,
                color: isDark ? Colors.grey[400] : Colors.grey[500],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF212529),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.grey[400] : Colors.grey[500],
                height: 1.4,
              ),
            ),
            if (buttonText != null && onAction != null) ...[
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 11,
                  ),
                ),
                icon: Icon(LucideIcons.plus, size: 15),
                label: Text(
                  buttonText!,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                onPressed: () {
                  AppHaptics.selection();
                  onAction!();
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
