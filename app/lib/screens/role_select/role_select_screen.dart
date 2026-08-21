import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../merchant/merchant_home_screen.dart';

class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              const Text('어떻게 이용하실 건가요?',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text('나중에 마이페이지에서 변경할 수 있어요',
                  style: TextStyle(fontSize: 14, color: Colors.grey[500])),
              const SizedBox(height: 40),
              _RoleCard(
                icon: LucideIcons.shoppingBag,
                title: '소비자',
                subtitle: '주변 동네 타임딜을\n찾고 싶어요',
                onTap: () => Navigator.of(context).pushReplacement(PageRouteBuilder(
                  pageBuilder: (_, _, _) => const MainScaffold(),
                  transitionDuration: const Duration(milliseconds: 150),
                  transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
                )),
              ),
              const SizedBox(height: 16),
              _RoleCard(
                icon: LucideIcons.store,
                title: '사장님',
                subtitle: '우리 가게 마감 특가를\n올리고 싶어요',
                onTap: () => Navigator.of(context).pushReplacement(PageRouteBuilder(
                  pageBuilder: (_, _, _) => const MerchantHomeScreen(),
                  transitionDuration: const Duration(milliseconds: 150),
                  transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
                )),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _RoleCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
          color: AppColors.primary.withValues(alpha: 0.04),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Icon(icon, size: 26, color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey[600], height: 1.4)),
                ],
              ),
            ),
            Icon(LucideIcons.chevronRight, size: 16, color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}
