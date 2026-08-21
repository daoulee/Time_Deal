import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../core/theme/app_colors.dart';
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

  // UX: 각 탭의 아이콘을 active/inactive로 명확히 구분 — 색상 외 형태 차이로 가시성 강화 (가시성)
  static final _navItems = [
    (icon: LucideIcons.home, label: '홈'),
    (icon: LucideIcons.mapPin, label: '지도'),
    (icon: LucideIcons.bell, label: '알림'),
    (icon: LucideIcons.user, label: '내정보'),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
          border: Border(top: BorderSide(color: borderColor)),
        ),
        // UX: 커스텀 네비게이션 바 — active 탭에 인디케이터 점 추가로 현재 위치 명확화 (가시성·피드백)
        child: SafeArea(
          child: SizedBox(
            height: 56,
            child: Row(
              children: List.generate(_navItems.length, (i) {
                final item = _navItems[i];
                final isActive = i == _currentIndex;
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      setState(() => _currentIndex = i);
                    },
                    behavior: HitTestBehavior.opaque,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // UX: active 탭 아이콘 크기 강조 + 색상 변화 (피드백)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          child: Icon(
                            item.icon,
                            size: isActive ? 22 : 20,
                            color: isActive
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.label,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
                            color: isActive
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        // UX: active 탭 하단 인디케이터 점 — 현재 위치를 형태로 명확히 전달 (가시성)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          width: isActive ? 4 : 0,
                          height: isActive ? 4 : 0,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
