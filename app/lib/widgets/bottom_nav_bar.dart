import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
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

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  final _screens = const [
    HomeScreen(),
    MapScreen(),
    NotificationsScreen(),
    MyPageScreen(),
  ];

  static final _navItems = [
    (icon: LucideIcons.home, activeIcon: Icons.home_rounded, label: '홈'),
    (icon: LucideIcons.mapPin, activeIcon: Icons.location_on_rounded, label: '지도'),
    (icon: LucideIcons.bell, activeIcon: Icons.notifications_rounded, label: '알림'),
    (icon: LucideIcons.user, activeIcon: Icons.person_rounded, label: '내정보'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // [Antigravity | 2026-08-21] 수정범위: MainScaffold — Apple Liquid Glass + Toss 인터랙션 플로팅 캡슐 내비게이션 바 전면 구현
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: SafeArea(
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
                  color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.22),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                  spreadRadius: -2,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(36),
              child: BackdropFilter(
                filter: ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF16171B).withValues(alpha: 0.90),
                    borderRadius: BorderRadius.circular(36),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.16),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(_navItems.length, (i) {
                      final item = _navItems[i];
                      final isActive = i == _currentIndex;

                      return Expanded(
                        child: GestureDetector(
                          onTap: () {
                            AppHaptics.selection();
                            setState(() => _currentIndex = i);
                          },
                          behavior: HitTestBehavior.opaque,
                          child: Center(
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 260),
                              curve: Curves.easeOutCubic,
                              width: isActive ? 58 : 46,
                              height: 48,
                              decoration: BoxDecoration(
                                color: isActive
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(isActive ? 24 : 23),
                                boxShadow: isActive
                                    ? [
                                        BoxShadow(
                                          color: Colors.white.withValues(alpha: 0.25),
                                          blurRadius: 10,
                                          spreadRadius: 1,
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Center(
                                child: AnimatedScale(
                                  scale: isActive ? 1.08 : 1.0,
                                  duration: const Duration(milliseconds: 200),
                                  curve: Curves.easeInOut,
                                  child: Icon(
                                    isActive ? item.activeIcon : item.icon,
                                    size: isActive ? 22 : 20,
                                    color: isActive
                                        ? const Color(0xFF16171B)
                                        : Colors.white.withValues(alpha: 0.75),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
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
