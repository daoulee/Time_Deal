import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/providers/deal_provider.dart';
import '../core/providers/location_provider.dart';
import '../core/providers/profile_provider.dart';
import '../core/theme/app_colors.dart';
import '../core/utils/app_haptics.dart';

// [Antigravity | 2026-08-23] 수정범위: NeighborhoodReverificationDialog — 다크/라이트 모드 최적화 고품격 동네 재인증 모달 디자인 전면 개편
class NeighborhoodReverificationDialog extends StatefulWidget {
  final String previousNeighborhood;
  final String currentNeighborhood;
  final Position position;

  const NeighborhoodReverificationDialog({
    super.key,
    required this.previousNeighborhood,
    required this.currentNeighborhood,
    required this.position,
  });

  /// 불일치 감지 시 강제 모달 팝업 호출 (닫기 불가)
  static Future<void> show(
    BuildContext context, {
    required String previousNeighborhood,
    required String currentNeighborhood,
    required Position position,
  }) async {
    if (!context.mounted) return;
    return showDialog(
      context: context,
      barrierDismissible: false, // 배경 터치로 닫기 불가
      builder: (_) => NeighborhoodReverificationDialog(
        previousNeighborhood: previousNeighborhood,
        currentNeighborhood: currentNeighborhood,
        position: position,
      ),
    );
  }

  @override
  State<NeighborhoodReverificationDialog> createState() =>
      _NeighborhoodReverificationDialogState();
}

class _NeighborhoodReverificationDialogState
    extends State<NeighborhoodReverificationDialog> {
  bool _isProcessing = false;

  Future<void> _handleReverify() async {
    setState(() => _isProcessing = true);
    AppHaptics.selection();

    await Future.delayed(const Duration(milliseconds: 350));
    if (!mounted) return;

    final loc = context.read<LocationProvider>();
    final deal = context.read<DealProvider>();
    final profile = context.read<ProfileProvider>();

    // 1. LocationProvider 동네 변경 및 영속화
    await loc.confirmNeighborhoodReverification(
      widget.currentNeighborhood,
      widget.position,
    );

    // 2. ProfileProvider 동네 인증 상태 갱신
    await profile.verifyNeighborhood(
      lat: widget.position.latitude,
      lng: widget.position.longitude,
    );

    // 3. DealProvider 거리 갱신 및 실시간 딜 재조회
    deal.updateDistances(
      widget.position.latitude,
      widget.position.longitude,
      neighborhood: widget.currentNeighborhood,
    );
    await deal.refresh();

    AppHaptics.success();
    if (!mounted) return;

    Navigator.of(context).pop();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF1E1F24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        content: Row(
          children: [
            Icon(LucideIcons.checkCircle2, color: AppColors.primary, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '\'${widget.currentNeighborhood}\'(으)로 동네 위치가 재인증되었습니다',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 13.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1A1B20) : Colors.white;

    return PopScope(
      canPop: false, // 뒤로가기 버튼으로 닫기 강제 방지
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Material(
            color: Colors.transparent,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: BackdropFilter(
                filter: ui.ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.06),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.50 : 0.12),
                        blurRadius: 36,
                        offset: const Offset(0, 16),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 1. 상단 미니 배지
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF25262D)
                              : AppColors.primary.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(20),
                          border: isDark
                              ? Border.all(
                                  color: Colors.white.withValues(alpha: 0.06),
                                  width: 0.8,
                                )
                              : null,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              LucideIcons.compass,
                              size: 13,
                              color: isDark
                                  ? const Color(0xFFFF8A54)
                                  : AppColors.primary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '현재 위치 감지',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? const Color(0xFFFF8A54)
                                    : AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // 2. 프리미엄 위치 원형 아이콘
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF7A3D), Color(0xFFFF5216)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(
                                alpha: isDark ? 0.35 : 0.25,
                              ),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Icon(
                            LucideIcons.mapPin,
                            size: 30,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // 3. 메인 타이틀
                      Text(
                        '\'${widget.currentNeighborhood}\'에 계신가요?',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 21,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: isDark ? Colors.white : const Color(0xFF1A1B20),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '현재 계신 동네로 위치를 재인증하고\n3km 반경 내 마감 타임딜을 확인해보세요.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13.5,
                          color: isDark ? const Color(0xFF9E9EA6) : Colors.grey[600],
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 22),

                      // 4. 가로형 동네 전환 카드 (Location Transition Flow)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF22232A)
                              : const Color(0xFFF6F7F9),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.06)
                                : Colors.black.withValues(alpha: 0.04),
                          ),
                        ),
                        child: Row(
                          children: [
                            // 이전 동네 (취소선)
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '이전 접속 동네',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: isDark
                                          ? const Color(0xFF75767E)
                                          : Colors.grey[500],
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    widget.previousNeighborhood,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: isDark
                                          ? const Color(0xFF8E8F96)
                                          : Colors.grey[500],
                                      decoration: TextDecoration.lineThrough,
                                      decorationColor: isDark
                                          ? const Color(0xFF8E8F96)
                                          : Colors.grey[500],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // 화살표
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF2C2D36)
                                    : Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                LucideIcons.arrowRight,
                                size: 14,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            // 현재 동네 (하이라이트)
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '현재 감지 위치',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: isDark
                                          ? const Color(0xFFFF8A54)
                                          : AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    widget.currentNeighborhood,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w900,
                                      color: isDark
                                          ? Colors.white
                                          : AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // 5. 강제 재인증 시작 버튼
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          onPressed: _isProcessing ? null : _handleReverify,
                          child: _isProcessing
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(LucideIcons.checkCheck, size: 18),
                                    const SizedBox(width: 8),
                                    Text(
                                      '\'${widget.currentNeighborhood}\'(으)로 동네 시작하기',
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.2,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
