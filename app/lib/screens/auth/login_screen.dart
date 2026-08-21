// [Antigravity | 2026-08-21] 수정범위: LoginScreen — 미가입 계정 로그인 시도시 "회원가입이 안 된 계정이네요!" 경고 모달 및 회원가입 즉시 전환 플로우 구현
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/auth_feedback.dart';
import '../role_select/role_select_screen.dart';
import '../setup/post_login_setup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  void _showAuthLog(BuildContext context) {
    final logs = context.read<AuthProvider>().authLog;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  const Text('Auth Debug Log',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace')),
                  const Spacer(),
                  Text('${logs.length}줄',
                      style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
            const Divider(color: Color(0xFF333333), height: 1),
            Expanded(
              child: logs.isEmpty
                  ? const Center(
                      child: Text('로그 없음 — 로그인을 시도해보세요',
                          style: TextStyle(color: Colors.grey, fontSize: 13)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      reverse: true,
                      itemCount: logs.length,
                      itemBuilder: (_, i) {
                        final line = logs[logs.length - 1 - i];
                        final isError = line.contains('ERROR');
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            line,
                            style: TextStyle(
                              color: isError
                                  ? const Color(0xFFFF6B6B)
                                  : const Color(0xFF88FF88),
                              fontSize: 11,
                              fontFamily: 'monospace',
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _goNext(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final setupDone = prefs.getBool('setup_done') ?? false;
    final name = context.mounted ? context.read<AuthProvider>().displayName : null;
    if (!context.mounted) return;

    if (setupDone) {
      AuthFeedback.showLoginToast(context, name: name);
    }

    Navigator.of(context).pushReplacement(PageRouteBuilder(
      pageBuilder: (_, _, _) => setupDone ? const RoleSelectScreen() : const PostLoginSetupScreen(),
      transitionDuration: const Duration(milliseconds: 150),
      transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
    ));
  }

  Future<void> _showNotRegisteredDialog({
    required BuildContext context,
    required String message,
    required VoidCallback onProceedSignUp,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dlgCtx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF222228) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person_add_alt_1_rounded,
                  size: 28, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            const Text(
              '회원가입이 안 된 계정이네요!',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(dlgCtx);
                  onProceedSignUp();
                },
                child: const Text(
                  '회원가입 진행하기',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(height: 4),
            TextButton(
              onPressed: () => Navigator.pop(dlgCtx),
              child: Text(
                '취소',
                style: TextStyle(fontSize: 13, color: Colors.grey[500]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLogin(
    BuildContext context,
    Future<bool> Function() signIn,
  ) async {
    final ok = await signIn();
    if (!context.mounted) return;
    if (ok) {
      final auth = context.read<AuthProvider>();
      if (auth.isNewUser) {
        // 미가입 신규 소셜 계정으로 로그인한 경우 팝업 띄우기
        await _showNotRegisteredDialog(
          context: context,
          message: '우리 동네 타임딜에 처음 오셨군요!\n회원가입을 완료하고 혜택을 시작할게요.',
          onProceedSignUp: () async {
            if (!context.mounted) return;
            await auth.markRegistered();
            if (!context.mounted) return;
            await AuthFeedback.showSignUpSuccess(
              context,
              message: '우리 동네 타임딜에 오신 것을 환영해요',
              onComplete: () {
                if (!context.mounted) return;
                _goNext(context);
              },
            );
          },
        );
      } else {
        _goNext(context);
      }
    }
  }

  Future<void> _handleSignUp(
    BuildContext context,
    Future<bool> Function() signUp,
  ) async {
    final ok = await signUp();
    if (!context.mounted) return;
    if (ok) {
      final auth = context.read<AuthProvider>();
      await auth.markRegistered();
      if (!context.mounted) return;
      await AuthFeedback.showSignUpSuccess(
        context,
        message: '우리 동네 타임딜에 오신 것을 환영해요',
        onComplete: () {
          if (!context.mounted) return;
          _goNext(context);
        },
      );
    }
  }

  void _showSocialLoginModal(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E1E22) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                '소셜 계정으로 로그인',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                '이용하실 소셜 계정을 선택해주세요',
                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
              ),
              const SizedBox(height: 24),
              // 카카오
              _SocialButton(
                color: const Color(0xFFFEE500),
                textColor: const Color(0xFF191919),
                svgAsset: 'assets/icons/kakao.svg',
                iconSize: 24,
                label: '카카오로 계속하기',
                busy: auth.loading,
                onTap: () {
                  Navigator.pop(modalCtx);
                  _handleLogin(context, () => auth.signInWithKakao());
                },
              ),
              const SizedBox(height: 12),
              // 구글
              _SocialButton(
                color: isDark ? const Color(0xFF2C2C30) : Colors.white,
                textColor: isDark ? Colors.white : const Color(0xFF191919),
                svgAsset: 'assets/icons/google.svg',
                iconSize: 22,
                label: '구글로 계속하기',
                hasBorder: !isDark,
                busy: auth.loading,
                onTap: () {
                  Navigator.pop(modalCtx);
                  _handleLogin(context, () => auth.signInWithGoogle());
                },
              ),
              const SizedBox(height: 12),
              // 이메일
              _SocialButton(
                color: Colors.transparent,
                textColor: AppColors.primary,
                label: '이메일로 로그인',
                hasBorder: true,
                borderColor: AppColors.primary.withValues(alpha: 0.4),
                busy: auth.loading,
                icon: const Icon(Icons.email_outlined, size: 20, color: AppColors.primary),
                onTap: () {
                  Navigator.pop(modalCtx);
                  _showEmailLoginSheet(context, onSuccess: () => _goNext(context));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionDivider(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Divider(
              color: Colors.grey.withValues(alpha: 0.3),
              thickness: 0.8,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.grey[500],
                letterSpacing: -0.2,
              ),
            ),
          ),
          Expanded(
            child: Divider(
              color: Colors.grey.withValues(alpha: 0.3),
              thickness: 0.8,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final busy = auth.loading;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(flex: 2),
              GestureDetector(
                onLongPress: () => _showAuthLog(context),
                child: ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFFFF6B35), AppColors.primary],
                  ).createShader(bounds),
                  child: const Padding(
                    padding: EdgeInsets.only(right: 16),
                    child: Text('Deal',
                        style: TextStyle(fontFamily: 'Pacifico', fontSize: 52, color: Colors.white)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Text('우리 동네 타임딜',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('마감 임박 특가를 동네에서 바로 잡아요',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600])),
              const Spacer(flex: 3),
              // 에러 표시
              if (auth.error != null) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, size: 15, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(child: Text(auth.error!,
                          style: const TextStyle(fontSize: 13, color: Colors.red))),
                      GestureDetector(
                        onTap: auth.clearError,
                        child: const Icon(Icons.close, size: 15, color: Colors.red),
                      ),
                    ],
                  ),
                ),
              ],
              // 섹션 1: 이미 계정이 있으신가요?
              _buildSectionDivider('이미 계정이 있으신가요?'),
              const SizedBox(height: 4),
              // 버튼 1: 소셜 로그인
              _RotatingSocialButton(
                busy: busy,
                onTap: () => _showSocialLoginModal(context),
              ),
              const SizedBox(height: 10),
              // 섹션 2: 처음이신가요?
              _buildSectionDivider('처음이신가요?'),
              const SizedBox(height: 4),
              // 버튼 2: 회원가입
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: busy
                      ? null
                      : () => _showSignUpSheet(
                            context,
                            onSocialSignUp: (provider) => _handleSignUp(context, provider),
                            onSuccess: () => _goNext(context),
                          ),
                  child: const Text(
                    '회원가입',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // 버튼 3: 게스트로 둘러보기
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey[600],
                    side: BorderSide(color: Colors.grey.withValues(alpha: 0.3)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: busy ? null : () => Navigator.of(context).pushReplacement(PageRouteBuilder(
                    pageBuilder: (_, _, _) => const RoleSelectScreen(),
                    transitionDuration: const Duration(milliseconds: 150),
                    transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
                  )),
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

/// 2초 간격으로 Kakao -> Google -> Email 로고가 Fade In/Out 되는 소셜 로그인 버튼
class _RotatingSocialButton extends StatefulWidget {
  final VoidCallback? onTap;
  final bool busy;

  const _RotatingSocialButton({
    required this.onTap,
    required this.busy,
  });

  @override
  State<_RotatingSocialButton> createState() => _RotatingSocialButtonState();
}

class _RotatingSocialButtonState extends State<_RotatingSocialButton> {
  int _currentIndex = 0;
  Timer? _timer;

  final List<({Widget icon, Color badgeBg, String name})> _providers = [
    (
      icon: SvgPicture.asset('assets/icons/kakao.svg', width: 20, height: 20),
      badgeBg: const Color(0xFFFEE500),
      name: '카카오',
    ),
    (
      icon: SvgPicture.asset('assets/icons/google.svg', width: 20, height: 20),
      badgeBg: Colors.white,
      name: '구글',
    ),
    (
      icon: const Icon(Icons.email_rounded, size: 20, color: Colors.white),
      badgeBg: AppColors.primary,
      name: '이메일',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted) return;
      setState(() => _currentIndex = (_currentIndex + 1) % _providers.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final current = _providers[_currentIndex];

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: isDark ? const Color(0xFF2C2C30) : Colors.white,
          foregroundColor: isDark ? Colors.white : const Color(0xFF191919),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(
              color: isDark ? Colors.white.withValues(alpha: 0.12) : const Color(0xFFE2E8F0),
              width: 1.2,
            ),
          ),
        ),
        onPressed: widget.busy ? null : widget.onTap,
        child: widget.busy
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: isDark ? Colors.white : AppColors.primary,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 350),
                    transitionBuilder: (child, animation) => FadeTransition(
                      opacity: animation,
                      child: ScaleTransition(scale: animation, child: child),
                    ),
                    child: Container(
                      key: ValueKey<int>(_currentIndex),
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: current.badgeBg,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.12),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: current.icon,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '소셜 로그인',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF191919),
                      letterSpacing: -0.3,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// 소셜(카카오/구글) + 이메일 통합 회원가입 모달 시트
void _showSignUpSheet(
  BuildContext context, {
  String? initialEmail,
  required Function(Future<bool> Function() provider) onSocialSignUp,
  required VoidCallback onSuccess,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final auth = context.read<AuthProvider>();
  final emailCtrl = TextEditingController(text: initialEmail ?? '');
  final pwCtrl = TextEditingController();
  final pwConfirmCtrl = TextEditingController();
  bool showEmailForm = initialEmail != null && initialEmail.isNotEmpty;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: isDark ? const Color(0xFF1E1E22) : Colors.white,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (modalCtx) => StatefulBuilder(
      builder: (ctx, setSheet) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(24, 16, 24,
              MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                '간편 회원가입',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                '소셜 계정 또는 이메일로 3초 만에 시작하세요',
                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
              ),
              const SizedBox(height: 24),
              // 1. 카카오로 3초 회원가입
              _SocialButton(
                color: const Color(0xFFFEE500),
                textColor: const Color(0xFF191919),
                svgAsset: 'assets/icons/kakao.svg',
                iconSize: 24,
                label: '카카오로 3초 회원가입',
                busy: auth.loading,
                onTap: () {
                  Navigator.pop(modalCtx);
                  onSocialSignUp(() => auth.signInWithKakao());
                },
              ),
              const SizedBox(height: 12),
              // 2. 구글로 간편 회원가입
              _SocialButton(
                color: isDark ? const Color(0xFF2C2C30) : Colors.white,
                textColor: isDark ? Colors.white : const Color(0xFF191919),
                svgAsset: 'assets/icons/google.svg',
                iconSize: 22,
                label: '구글로 간편 회원가입',
                hasBorder: !isDark,
                busy: auth.loading,
                onTap: () {
                  Navigator.pop(modalCtx);
                  onSocialSignUp(() => auth.signInWithGoogle());
                },
              ),
              const SizedBox(height: 16),
              // 3. 이메일 폼 토글
              if (!showEmailForm) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => setSheet(() => showEmailForm = true),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.email_outlined, size: 18, color: AppColors.primary),
                        SizedBox(width: 8),
                        Text('이메일로 회원가입하기',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primary)),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                const Divider(height: 24),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: '이메일 주소',
                    hintText: 'example@email.com',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: pwCtrl,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: '비밀번호',
                    helperText: '6자 이상 입력해주세요',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: pwConfirmCtrl,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: '비밀번호 확인',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      final email = emailCtrl.text.trim();
                      final pw = pwCtrl.text;
                      final pwConfirm = pwConfirmCtrl.text;

                      if (email.isEmpty || pw.isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('이메일과 비밀번호를 입력해주세요'), behavior: SnackBarBehavior.floating),
                        );
                        return;
                      }
                      if (pw.length < 6) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('비밀번호는 6자 이상이어야 합니다'), behavior: SnackBarBehavior.floating),
                        );
                        return;
                      }
                      if (pw != pwConfirm) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('비밀번호가 일치하지 않습니다'), behavior: SnackBarBehavior.floating),
                        );
                        return;
                      }

                      final ok = await auth.signUpWithEmail(email, pw);
                      if (ok && ctx.mounted) {
                        Navigator.pop(modalCtx);
                        if (!context.mounted) return;
                        await AuthFeedback.showSignUpSuccess(
                          context,
                          message: '인증 메일을 확인 후 로그인해주세요',
                          onComplete: () {},
                        );
                      } else if (!ok && ctx.mounted && auth.error != null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(auth.error!), behavior: SnackBarBehavior.floating),
                        );
                        auth.clearError();
                      }
                    },
                    child: const Text('이메일 회원가입 완료',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}

/// 이메일 로그인 전용 시트
void _showEmailLoginSheet(
  BuildContext context, {
  required VoidCallback onSuccess,
}) {
  final emailCtrl = TextEditingController();
  final pwCtrl = TextEditingController();

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => StatefulBuilder(
      builder: (ctx, setSheet) => Padding(
        padding: EdgeInsets.fromLTRB(24, 20, 24,
            MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text('이메일로 로그인',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 20),
            TextField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: '이메일',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: pwCtrl,
              obscureText: true,
              decoration: InputDecoration(
                labelText: '비밀번호',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  final auth = context.read<AuthProvider>();
                  final email = emailCtrl.text.trim();
                  final pw = pwCtrl.text;

                  final ok = await auth.signInWithEmail(email, pw);
                  if (ok && ctx.mounted) {
                    Navigator.pop(ctx);
                    if (!context.mounted) return;
                    onSuccess();
                  } else if (!ok && ctx.mounted) {
                    // 미가입 계정으로 로그인 시도시 회원가입 안내 팝업
                    Navigator.pop(ctx);
                    if (!context.mounted) return;
                    showDialog(
                      context: context,
                      builder: (dlgCtx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.person_add_alt_1_rounded,
                                  size: 28, color: AppColors.primary),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              '회원가입이 안 된 계정이네요!',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '입력하신 이메일의 계정을 찾을 수 없어요.\n지금 바로 회원가입을 진행할게요!',
                              style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.4),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: () {
                                  Navigator.pop(dlgCtx);
                                  _showSignUpSheet(
                                    context,
                                    initialEmail: email,
                                    onSocialSignUp: (provider) =>
                                        context.findAncestorStateOfType<_LoginScreenState>()?._handleSignUp(context, provider),
                                    onSuccess: onSuccess,
                                  );
                                },
                                child: const Text(
                                  '회원가입 진행하기',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            TextButton(
                              onPressed: () => Navigator.pop(dlgCtx),
                              child: Text(
                                '취소',
                                style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                    auth.clearError();
                  }
                },
                child: const Text('로그인',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _SocialButton extends StatelessWidget {
  final Color color;
  final Color textColor;
  final String label;
  final VoidCallback? onTap;
  final bool hasBorder;
  final Color? borderColor;
  final bool busy;
  final String? svgAsset;
  final Widget? icon;
  final double iconSize;

  const _SocialButton({
    required this.color,
    required this.textColor,
    required this.label,
    required this.onTap,
    required this.busy,
    this.hasBorder = false,
    this.borderColor,
    this.svgAsset,
    this.icon,
    this.iconSize = 22,
  });

  @override
  Widget build(BuildContext context) {
    Widget? leadingIcon = icon;
    if (leadingIcon == null && svgAsset != null) {
      leadingIcon = SvgPicture.asset(svgAsset!, width: iconSize, height: iconSize);
    }

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: textColor,
          disabledBackgroundColor: color.withValues(alpha: 0.5),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: hasBorder
                ? BorderSide(color: borderColor ?? const Color(0xFFDDDDDD))
                : BorderSide.none,
          ),
        ),
        onPressed: busy ? null : onTap,
        child: busy
            ? SizedBox(width: 20, height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: textColor))
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (leadingIcon != null) ...[leadingIcon, const SizedBox(width: 10)],
                  Text(label,
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600,
                          color: textColor)),
                ],
              ),
      ),
    );
  }
}
