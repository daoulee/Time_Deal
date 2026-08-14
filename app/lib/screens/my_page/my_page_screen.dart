import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/providers/theme_provider.dart';
import '../../core/providers/wishlist_provider.dart';
import '../../core/theme/app_colors.dart';
import '../merchant/merchant_home_screen.dart';
import 'reservation_screen.dart';
import 'wishlist_screen.dart';
import 'location_settings_screen.dart';

class MyPageScreen extends StatelessWidget {
  const MyPageScreen({super.key});

  String _fmt(int price) => price
      .toString()
      .replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final rp = context.watch<ReservationProvider>();
    final wl = context.watch<WishlistProvider>();
    final location = context.watch<LocationProvider>();

    final savedAmount = rp
        .byStatus('픽업완료')
        .fold(0, (sum, r) => sum + (r.deal.originalPrice - r.deal.discountedPrice));

    return Scaffold(
      appBar: AppBar(
        title: const Text('내 정보', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        children: [
          // 프로필
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                  child: Icon(LucideIcons.user, size: 28, color: AppColors.primary),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('김동네', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text('${location.neighborhood} 주민', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                    ],
                  ),
                ),
                TextButton(onPressed: () {}, child: const Text('프로필 편집')),
              ],
            ),
          ),
          // 활동 요약 (실시간)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _StatCard(label: '예약', value: '${rp.all.length}'),
                const SizedBox(width: 8),
                _StatCard(label: '찜한 딜', value: '${wl.count}'),
                const SizedBox(width: 8),
                _StatCard(
                    label: '절약 금액',
                    value: savedAmount > 0 ? '${_fmt(savedAmount)}원' : '-'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SectionDivider(),
          _MenuSection(title: '내 활동', items: [
            _MenuItem(
              icon: LucideIcons.clipboardList, label: '예약 내역',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const ReservationScreen())),
            ),
            _MenuItem(
              icon: LucideIcons.heart, label: '찜 목록',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const WishlistScreen())),
            ),
            _MenuItem(icon: LucideIcons.star, label: '내가 쓴 리뷰'),
          ]),
          _SectionDivider(),
          _MenuSection(title: '설정', items: [
            _MenuItem(
              icon: LucideIcons.mapPin, label: '내 동네 설정',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const LocationSettingsScreen())),
            ),
            _MenuItem(icon: LucideIcons.bell, label: '알림 설정'),
            _MenuItem(
              icon: themeProvider.isDark ? LucideIcons.sun : LucideIcons.moon,
              label: themeProvider.isDark ? '라이트 모드' : '다크 모드',
              onTap: themeProvider.toggle,
            ),
          ]),
          _SectionDivider(),
          _MenuSection(title: '기타', items: [
            _MenuItem(
              icon: LucideIcons.store, label: '사장님으로 전환',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const MerchantHomeScreen())),
            ),
            _MenuItem(icon: LucideIcons.helpCircle, label: '고객센터'),
            _MenuItem(icon: LucideIcons.logOut, label: '로그아웃', isDestructive: true),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

class _SectionDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      height: 8,
      color: isDark
          ? Colors.white.withValues(alpha: 0.05)
          : Colors.black.withValues(alpha: 0.04),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.12)),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontSize: 16,
                fontWeight: FontWeight.w800, color: AppColors.primary)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          ],
        ),
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  final String title;
  final List<_MenuItem> items;
  const _MenuSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(title, style: TextStyle(fontSize: 12,
              fontWeight: FontWeight.w600, color: Colors.grey[400])),
        ),
        ...items,
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDestructive;
  final VoidCallback? onTap;

  const _MenuItem({required this.icon, required this.label,
      this.isDestructive = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? Colors.red : null;
    return ListTile(
      onTap: onTap ?? () {},
      leading: Icon(icon, size: 20, color: color ?? Colors.grey[600]),
      title: Text(label, style: TextStyle(fontSize: 14, color: color)),
      trailing: Icon(LucideIcons.chevronRight, size: 14, color: Colors.grey),
    );
  }
}
