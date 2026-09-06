import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../core/theme/app_colors.dart';
import '../core/utils/app_haptics.dart';
import '../screens/home/home_screen.dart';
import '../screens/map/map_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/my_page/my_page_screen.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  late AnimationController _entranceCtrl;
  late Animation<Offset> _navSlide;
  late Animation<double> _navFade;
  late Animation<double> _bodyFade;

  final _screens = const [
    HomeScreen(),
    MapScreen(),
    NotificationsScreen(),
    MyPageScreen(),
  ];

  static final _navItems = [
    (icon: LucideIcons.home, label: '홈'),
    (icon: LucideIcons.mapPin, label: '지도'),
    (icon: LucideIcons.bell, label: '알림'),
    (icon: LucideIcons.user, label: '내정보'),
  ];

  @override
  void initState() {
    super.initState();
    _entranceCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _navSlide = Tween<Offset>(
      begin: const Offset(0, 1.2),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.20, 1.0, curve: Curves.easeOutBack),
      ),
    );
    _navFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.20, 0.85, curve: Curves.easeOut),
      ),
    );
    _bodyFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.0, 0.70, curve: Curves.easeOut),
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
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // 라이트/다크 모드별 일체감 있는 유리 질감 테마 정의
    final capsuleBg = isDark
        ? const Color(0xFF1A1B20).withValues(alpha: 0.90)
        : Colors.white.withValues(alpha: 0.88);
    final capsuleBorderColor = isDark
        ? Colors.white.withValues(alpha: 0.14)
        : Colors.black.withValues(alpha: 0.08);
    final capsuleShadowColor = isDark
        ? Colors.black.withValues(alpha: 0.45)
        : Colors.black.withValues(alpha: 0.08);

    final activeItemBg = AppColors.primary;
    const activeItemIconColor = Colors.white;

    final inactiveItemIconColor = isDark
        ? Colors.white.withValues(alpha: 0.70)
        : Colors.black.withValues(alpha: 0.55);

    // [Antigravity | 2026-08-23] 수정범위: MainScaffold — RepaintBoundary 분리 및 블러 연산 최적화로 시뮬레이터 및 저사양 기기 잔렉(Jank) 완벽 제거
    return Scaffold(
      extendBody: true,
      body: RepaintBoundary(
        child: FadeTransition(
          opacity: _bodyFade,
          child: IndexedStack(index: _currentIndex, children: _screens),
        ),
      ),
      bottomNavigationBar: RepaintBoundary(
        child: SlideTransition(
          position: _navSlide,
          child: FadeTransition(
            opacity: _navFade,
            child: SafeArea(
              top: false,
              left: false,
              right: false,
              bottom: false,
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  28,
                  0,
                  28,
                  bottomPadding > 0 ? bottomPadding + 4 : 20,
                ),
                child: Container(
                  height: 64,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(36),
                    boxShadow: [
                      BoxShadow(
                        color: capsuleShadowColor,
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                        spreadRadius: -2,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(36),
                    child: BackdropFilter(
                      filter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                  decoration: BoxDecoration(
                    color: capsuleBg,
                    borderRadius: BorderRadius.circular(36),
                    border: Border.all(
                      color: capsuleBorderColor,
                      width: 1,
                    ),
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final slotWidth = constraints.maxWidth / _navItems.length;
                      final capsuleWidth = (slotWidth - 6).clamp(44.0, 62.0);

                      return Stack(
                        alignment: Alignment.centerLeft,
                        children: [
                          // 1. 단일 슬라이딩 액티브 캡슐 (잔상 없이 목표 탭으로 부드럽게 미끄러짐)
                          AnimatedPositioned(
                            duration: const Duration(milliseconds: 220),
                            curve: Curves.easeOutCubic,
                            left: (_currentIndex * slotWidth) + (slotWidth - capsuleWidth) / 2,
                            top: 0,
                            bottom: 0,
                            width: capsuleWidth,
                            child: Container(
                              decoration: BoxDecoration(
                                color: activeItemBg,
                                borderRadius: BorderRadius.circular(24),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(alpha: 0.35),
                                    blurRadius: 10,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          // 2. 탭 아이콘 레이어
                          Row(
                            children: List.generate(_navItems.length, (i) {
                              final item = _navItems[i];
                              final isActive = i == _currentIndex;

                              return Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    if (_currentIndex != i) {
                                      AppHaptics.selection();
                                      setState(() => _currentIndex = i);
                                    }
                                  },
                                  behavior: HitTestBehavior.opaque,
                                  child: Center(
                                    child: AnimatedScale(
                                      scale: isActive ? 1.08 : 1.0,
                                      duration: const Duration(milliseconds: 180),
                                      curve: Curves.easeOutCubic,
                                      child: TweenAnimationBuilder<Color?>(
                                        tween: ColorTween(
                                          end: isActive
                                              ? activeItemIconColor
                                              : inactiveItemIconColor,
                                        ),
                                        duration: const Duration(milliseconds: 180),
                                        builder: (_, color, _) {
                                          return Icon(
                                            item.icon,
                                            size: 21,
                                            color: color,
                                          );
                                        },
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
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
