import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../role_select/role_select_screen.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(flex: 2),
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Color(0xFFFF6B35), AppColors.primary],
                ).createShader(bounds),
                child: Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Text('Deal',
                      style: GoogleFonts.pacifico(fontSize: 52, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 8),
              const Text('우리 동네 타임딜',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('마감 임박 특가를 동네에서 바로 잡아요',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600])),
              const Spacer(flex: 3),
              _SocialButton(
                color: const Color(0xFFFEE500),
                textColor: const Color(0xFF191919),
                svgAsset: 'assets/icons/kakao.svg',
                iconSize: 28,
                label: '카카오로 시작하기',
                onTap: () => Navigator.pushReplacement(
                  context, MaterialPageRoute(builder: (_) => const RoleSelectScreen())),
              ),
              const SizedBox(height: 12),
              _SocialButton(
                color: const Color(0xFF03C75A),
                textColor: Colors.white,
                svgAsset: 'assets/icons/naver.svg',
                iconSize: 24,
                label: '네이버로 시작하기',
                onTap: () => Navigator.pushReplacement(
                  context, MaterialPageRoute(builder: (_) => const RoleSelectScreen())),
              ),
              const SizedBox(height: 12),
              _SocialButton(
                color: Colors.white,
                textColor: Colors.black87,
                iconAsset: 'assets/icons/google.png',
                iconSize: 30,
                label: '구글로 시작하기',
                hasBorder: true,
                onTap: () => Navigator.pushReplacement(
                  context, MaterialPageRoute(builder: (_) => const RoleSelectScreen())),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey[600],
                    side: BorderSide(color: Colors.grey.withValues(alpha: 0.3)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pushReplacement(
                    context, MaterialPageRoute(builder: (_) => const RoleSelectScreen())),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.userX, size: 18, color: Colors.grey[500]),
                      const SizedBox(width: 8),
                      Text('게스트로 둘러보기',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500,
                              color: Colors.grey[600])),
                    ],
                  ),
                ),
              ),
              const Spacer(flex: 1),
              Center(
                child: Text('로그인 시 서비스 이용약관에 동의하게 됩니다',
                    style: TextStyle(fontSize: 11, color: Colors.grey[400])),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  final Color color;
  final Color textColor;
  final String label;
  final VoidCallback onTap;
  final bool hasBorder;
  final String? svgAsset;
  final String? iconAsset;
  final double iconSize;

  const _SocialButton({
    required this.color,
    required this.textColor,
    required this.label,
    required this.onTap,
    this.hasBorder = false,
    this.svgAsset,
    this.iconAsset,
    this.iconSize = 22,
  });

  @override
  Widget build(BuildContext context) {
    Widget? icon;
    if (svgAsset != null) {
      icon = SvgPicture.asset(svgAsset!, width: iconSize, height: iconSize);
    } else if (iconAsset != null) {
      icon = Image.asset(iconAsset!, width: iconSize, height: iconSize, fit: BoxFit.contain);
    }

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: textColor,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: hasBorder ? const BorderSide(color: Color(0xFFDDDDDD)) : BorderSide.none,
          ),
        ),
        onPressed: onTap,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              icon,
              const SizedBox(width: 10),
            ],
            Text(label,
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: textColor)),
          ],
        ),
      ),
    );
  }
}
