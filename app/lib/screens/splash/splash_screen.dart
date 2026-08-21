import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../auth/login_screen.dart';
import '../onboarding/onboarding_screen.dart';
import '../role_select/role_select_screen.dart';
import '../setup/post_login_setup_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _fadeController;
  late AnimationController _glowController;
  late AnimationController _handshakeController;
  late AnimationController _handshakeFadeController;

  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;
  late Animation<double> _glowAnim;
  late Animation<double> _handshakeShakeAnim;
  late Animation<double> _handshakeScaleAnim;
  late Animation<double> _handshakeFadeAnim;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _handshakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _handshakeFadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _scaleAnim = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
    );
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeIn),
    );
    _glowAnim = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );
    // 좌우 흔들림 (-8° ~ +8°)
    _handshakeShakeAnim = Tween<double>(begin: -0.14, end: 0.14).animate(
      CurvedAnimation(parent: _handshakeController, curve: Curves.easeInOut),
    );
    // 악수 시 살짝 위아래 스케일
    _handshakeScaleAnim = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.12), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 1.12, end: 1.0), weight: 50),
    ]).animate(_handshakeController);
    _handshakeFadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _handshakeFadeController, curve: Curves.easeOut),
    );

    _runSequence();
  }

  Future<void> _runSequence() async {
    await Future.delayed(const Duration(milliseconds: 200));
    _fadeController.forward();
    _scaleController.forward();

    await Future.delayed(const Duration(milliseconds: 600));
    _glowController.repeat(reverse: true);

    // Deal 텍스트 안정된 후 handshake 페이드인 + 반복 흔들림
    await Future.delayed(const Duration(milliseconds: 300));
    _handshakeFadeController.forward();
    _handshakeController.repeat(reverse: true);

    await Future.delayed(const Duration(milliseconds: 1200));

    _glowController.stop();
    _handshakeController.stop();
    await _fadeController.reverse();

    if (!mounted) return;
    final prefs = await SharedPreferences.getInstance();
    final onboardingDone = prefs.getBool('onboarding_done') ?? false;
    final setupDone = prefs.getBool('setup_done') ?? false;
    final session = Supabase.instance.client.auth.currentSession;
    if (!mounted) return;

    Widget next;
    if (!onboardingDone) {
      next = const OnboardingScreen();
    } else if (session != null) {
      next = setupDone ? const RoleSelectScreen() : const PostLoginSetupScreen();
    } else {
      next = const LoginScreen();
    }

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, _, _) => next,
        transitionDuration: const Duration(milliseconds: 150),
        transitionsBuilder: (_, animation, _, child) => FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _fadeController.dispose();
    _glowController.dispose();
    _handshakeController.dispose();
    _handshakeFadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;

    return Scaffold(
      backgroundColor: bg,
      body: Center(
        child: AnimatedBuilder(
          animation: Listenable.merge([
            _scaleAnim, _fadeAnim, _glowAnim,
            _handshakeShakeAnim, _handshakeScaleAnim, _handshakeFadeAnim,
          ]),
          builder: (context, _) {
            return Opacity(
              opacity: _fadeAnim.value,
              child: Transform.scale(
                scale: _scaleAnim.value,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 네온 글로우 "Deal" 텍스트
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        if (isDark)
                          Padding(
                            padding: const EdgeInsets.only(right: 24, bottom: 8),
                            child: Text(
                              'Deal',
                              style: TextStyle(
                                fontFamily: 'Pacifico',
                                fontSize: 72,
                                color: AppColors.primary
                                    .withValues(alpha: 0.4 * _glowAnim.value),
                                shadows: [
                                  Shadow(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.8 * _glowAnim.value),
                                    blurRadius: 40,
                                  ),
                                  Shadow(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.5 * _glowAnim.value),
                                    blurRadius: 80,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ShaderMask(
                          shaderCallback: (bounds) => const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFFFF6B35), AppColors.primary],
                          ).createShader(bounds),
                          child: Padding(
                            padding: const EdgeInsets.only(right: 24, bottom: 8),
                            child: Text(
                              'Deal',
                              style: const TextStyle(
                                fontFamily: 'Pacifico',
                                fontSize: 72,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '우리 동네 타임딜',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? AppColors.darkTextSecondary
                            : AppColors.lightTextSecondary,
                        letterSpacing: 2.0,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 32),
                    // 악수 아이콘 — 좌우 흔들림 + 페이드인
                    Opacity(
                      opacity: _handshakeFadeAnim.value,
                      child: Transform.rotate(
                        angle: _handshakeShakeAnim.value,
                        child: Transform.scale(
                          scale: _handshakeScaleAnim.value,
                          child: Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  const Color(0xFFFF6B35).withValues(alpha: 0.15),
                                  AppColors.primary.withValues(alpha: 0.15),
                                ],
                              ),
                              border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.3),
                                width: 1.5,
                              ),
                            ),
                            child: const Icon(
                              Icons.handshake_rounded,
                              size: 34,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
