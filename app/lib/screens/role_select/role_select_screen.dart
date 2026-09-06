import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../merchant/merchant_home_screen.dart';

// [Antigravity | 2026-08-23] 수정범위: RoleSelectScreen — 스태거드(Staggered) 스프링 페이드업 등장 모션, 인터랙티브 프레스 햅틱, 비주얼 카드 고도화
class RoleSelectScreen extends StatefulWidget {
  const RoleSelectScreen({super.key});

  @override
  State<RoleSelectScreen> createState() => _RoleSelectScreenState();
}

class _RoleSelectScreenState extends State<RoleSelectScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;

  // 순차적(Staggered) 등장 애니메이션
  late Animation<double> _titleFade;
  late Animation<Offset> _titleSlide;

  late Animation<double> _customerFade;
  late Animation<double> _customerScale;
  late Animation<Offset> _customerSlide;

  late Animation<double> _merchantFade;
  late Animation<double> _merchantScale;
  late Animation<Offset> _merchantSlide;

  late Animation<double> _footerFade;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );

    // 1. 헤더 (0 ~ 400ms)
    _titleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.0, 0.45, curve: Curves.easeOut),
      ),
    );
    _titleSlide = Tween<Offset>(
      begin: const Offset(0, -0.15),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.0, 0.45, curve: Curves.easeOutCubic),
      ),
    );

    // 2. 소비자 카드 (200 ~ 650ms, 스프링 바운스)
    _customerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.2, 0.65, curve: Curves.easeOut),
      ),
    );
    _customerScale = Tween<double>(begin: 0.90, end: 1.0).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.2, 0.70, curve: Curves.easeOutBack),
      ),
    );
    _customerSlide = Tween<Offset>(
      begin: const Offset(0, 0.25),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.2, 0.70, curve: Curves.easeOutCubic),
      ),
    );

    // 3. 사장님 카드 (350 ~ 800ms, 연속 스프링)
    _merchantFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.35, 0.80, curve: Curves.easeOut),
      ),
    );
    _merchantScale = Tween<double>(begin: 0.90, end: 1.0).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.35, 0.85, curve: Curves.easeOutBack),
      ),
    );
    _merchantSlide = Tween<Offset>(
      begin: const Offset(0, 0.25),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.35, 0.85, curve: Curves.easeOutCubic),
      ),
    );

    // 4. 하단 힌트 (600 ~ 900ms)
    _footerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: const Interval(0.60, 1.0, curve: Curves.easeOut),
      ),
    );

    // 약간의 딜레이 후 시퀀스 시작
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) _animCtrl.forward();
    });
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  // [Antigravity | 2026-08-23] 수정범위: _navigateTo() — 모드 선택 후 메인/사장님 홈 진입 시 450ms 시네마틱 페이드+슬라이드+스케일 라우트 모션 적용
  void _navigateTo(Widget screen) {
    AppHaptics.selection();
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, _, _) => screen,
        transitionDuration: const Duration(milliseconds: 450),
        transitionsBuilder: (_, anim, secondaryAnim, child) {
          final fade = CurvedAnimation(
            parent: anim,
            curve: Curves.easeInOutCubic,
          );
          final slide = Tween<Offset>(
            begin: const Offset(0, 0.05),
            end: Offset.zero,
          ).animate(
            CurvedAnimation(parent: anim, curve: Curves.easeOutCubic),
          );
          final scale = Tween<double>(begin: 0.95, end: 1.0).animate(
            CurvedAnimation(parent: anim, curve: Curves.easeOutCubic),
          );
          return FadeTransition(
            opacity: fade,
            child: SlideTransition(
              position: slide,
              child: ScaleTransition(scale: scale, child: child),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF131418) : const Color(0xFFF7F8FA);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              // 상단 헤더 (Fade + Slide)
              FadeTransition(
                opacity: _titleFade,
                child: SlideTransition(
                  position: _titleSlide,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF22232A)
                              : AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: isDark
                              ? Border.all(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  width: 0.8,
                                )
                              : null,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              LucideIcons.sparkles,
                              size: 13,
                              color: isDark
                                  ? const Color(0xFFFF8A54)
                                  : AppColors.primary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '시작하기',
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
                      const SizedBox(height: 14),
                      const Text(
                        '어떻게 이용하실 건가요?',
                        style: TextStyle(
                          fontSize: 27,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.6,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '원하시는 모드를 선택해 주세요.\n언제든 마이페이지에서 자유롭게 전환할 수 있어요.',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 36),

              // 카드 1: 소비자 카드
              FadeTransition(
                opacity: _customerFade,
                child: SlideTransition(
                  position: _customerSlide,
                  child: ScaleTransition(
                    scale: _customerScale,
                    child: _InteractiveRoleCard(
                      badgeText: '소비자 모드',
                      badgeIcon: LucideIcons.mapPin,
                      icon: LucideIcons.shoppingBag,
                      title: '동네 타임딜 찾기',
                      subtitle: '내 주변 3km 소상공인의\n마감 특가 딜을 발견하고 예약해요',
                      tags: const ['실시간 할인', '스마트 픽업', '노쇼 안심'],
                      accentColor: AppColors.primary,
                      isDark: isDark,
                      onTap: () => _navigateTo(const MainScaffold()),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // 카드 2: 사장님 카드
              FadeTransition(
                opacity: _merchantFade,
                child: SlideTransition(
                  position: _merchantSlide,
                  child: ScaleTransition(
                    scale: _merchantScale,
                    child: _InteractiveRoleCard(
                      badgeText: '사장님 모드',
                      badgeIcon: LucideIcons.store,
                      icon: LucideIcons.store,
                      title: '가게 마감 딜 등록하기',
                      subtitle: '당일 남은 재고를 타임딜로 등록해\n수수료 없이 빠르게 완판해요',
                      tags: const ['1분 간편 등록', '실시간 주문', '매출 정산'],
                      accentColor: const Color(0xFF3B82F6),
                      isDark: isDark,
                      onTap: () => _navigateTo(const MerchantHomeScreen()),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 36),

              // 하단 안내 힌트
              FadeTransition(
                opacity: _footerFade,
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.helpCircle,
                        size: 14,
                        color: isDark ? Colors.grey[500] : Colors.grey[400],
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '앱 내에서 언제든 모드 전환이 가능합니다',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: isDark ? Colors.grey[400] : Colors.grey[500],
                          fontWeight: FontWeight.w500,
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
    );
  }
}

/// 쫀득한 터치 애니메이션(Interactive Bounce)이 탑재된 역할 선택 카드
class _InteractiveRoleCard extends StatefulWidget {
  final String badgeText;
  final IconData badgeIcon;
  final IconData icon;
  final String title;
  final String subtitle;
  final List<String> tags;
  final Color accentColor;
  final bool isDark;
  final VoidCallback onTap;

  const _InteractiveRoleCard({
    required this.badgeText,
    required this.badgeIcon,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.tags,
    required this.accentColor,
    required this.isDark,
    required this.onTap,
  });

  @override
  State<_InteractiveRoleCard> createState() => _InteractiveRoleCardState();
}

class _InteractiveRoleCardState extends State<_InteractiveRoleCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final cardBg = widget.isDark
        ? const Color(0xFF1B1C22)
        : Colors.white;

    return AnimatedScale(
      scale: _isPressed ? 0.965 : 1.0,
      duration: const Duration(milliseconds: 140),
      curve: Curves.easeOutCubic,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          Future.delayed(const Duration(milliseconds: 60), widget.onTap);
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: _isPressed
                  ? widget.accentColor.withValues(alpha: widget.isDark ? 0.50 : 0.60)
                  : widget.isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.06),
              width: _isPressed ? 1.5 : 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.isDark
                    ? Colors.black.withValues(alpha: 0.35)
                    : widget.accentColor.withValues(alpha: _isPressed ? 0.16 : 0.06),
                blurRadius: _isPressed ? 18 : 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 상단 배지 + 셰브론
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: widget.isDark
                          ? widget.accentColor.withValues(alpha: 0.15)
                          : widget.accentColor.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(10),
                      border: widget.isDark
                          ? Border.all(
                              color: widget.accentColor.withValues(alpha: 0.30),
                              width: 0.8,
                            )
                          : null,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          widget.badgeIcon,
                          size: 12,
                          color: widget.accentColor,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          widget.badgeText,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: widget.accentColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: widget.isDark
                          ? const Color(0xFF262730)
                          : widget.accentColor.withValues(
                              alpha: _isPressed ? 0.22 : 0.10,
                            ),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Icon(
                        LucideIcons.arrowRight,
                        size: 15,
                        color: widget.isDark
                            ? Colors.white70
                            : widget.accentColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 아이콘 + 타이틀
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: widget.isDark
                          ? widget.accentColor.withValues(alpha: 0.16)
                          : widget.accentColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(16),
                      border: widget.isDark
                          ? Border.all(
                              color: widget.accentColor.withValues(alpha: 0.25),
                              width: 0.8,
                            )
                          : null,
                    ),
                    child: Center(
                      child: Icon(
                        widget.icon,
                        size: 24,
                        color: widget.accentColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                        color: widget.isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 설명 문구
              Text(
                widget.subtitle,
                style: TextStyle(
                  fontSize: 13.5,
                  color: widget.isDark ? const Color(0xFF9E9EA6) : Colors.grey[600],
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),

              // 태그 칩들
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: widget.tags.map((tag) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: widget.isDark
                          ? const Color(0xFF25262D)
                          : const Color(0xFFF1F3F5),
                      borderRadius: BorderRadius.circular(8),
                      border: widget.isDark
                          ? Border.all(
                              color: Colors.white.withValues(alpha: 0.06),
                              width: 0.6,
                            )
                          : null,
                    ),
                    child: Text(
                      tag,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: widget.isDark
                            ? const Color(0xFFB0B1B8)
                            : Colors.grey[700],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
