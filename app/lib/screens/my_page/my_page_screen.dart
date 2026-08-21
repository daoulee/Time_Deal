import 'dart:io';
import 'dart:ui' as ui;
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/providers/profile_provider.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/providers/theme_provider.dart';
import '../../core/providers/wishlist_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../auth/login_screen.dart';
import '../merchant/merchant_home_screen.dart';
import 'customer_service_screen.dart';
import 'location_settings_screen.dart';
import 'my_reviews_screen.dart';
import 'reservation_screen.dart';
import 'wishlist_screen.dart';

class MyPageScreen extends StatelessWidget {
  const MyPageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final rp = context.watch<ReservationProvider>();
    final wl = context.watch<WishlistProvider>();
    final location = context.watch<LocationProvider>();
    final profile = context.watch<ProfileProvider>();

    final savedAmount = rp
        .byStatus('픽업완료')
        .fold(0, (sum, r) => sum + (r.deal.originalPrice - r.deal.discountedPrice));

    // [Antigravity | 2026-08-21] 수정범위: MyPageScreen — 상단 헤더 프로스티드 글래스 블러(Frosted Glass Blur) 및 부드러운 스크롤 페이드 적용
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: ClipRect(
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.82),
                border: Border(
                  bottom: BorderSide(
                    color: Colors.grey.withValues(alpha: 0.12),
                    width: 0.5,
                  ),
                ),
              ),
              child: AppBar(
                title: const Text('내 정보', style: TextStyle(fontWeight: FontWeight.w800)),
                backgroundColor: Colors.transparent,
                elevation: 0,
                scrolledUnderElevation: 0,
              ),
            ),
          ),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + kToolbarHeight + 8,
          bottom: 28,
        ),
        children: [
          // 프로필
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                _ProfileAvatar(profile: profile),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(profile.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      GestureDetector(
                        onTap: () => _showVerifySheet(context, profile, location),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('${location.neighborhood} 주민',
                                style: const TextStyle(fontSize: 13, color: Colors.grey)),
                            const SizedBox(width: 4),
                            if (profile.verifiedNeighborhood != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.verified, size: 11, color: Color(0xFF10B981)),
                                    SizedBox(width: 2),
                                    Text('인증완료', style: TextStyle(fontSize: 10,
                                        fontWeight: FontWeight.w700, color: Color(0xFF10B981))),
                                  ],
                                ),
                              )
                            else
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.grey.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text('동네 인증하기',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.grey)),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => _showProfileEdit(context),
                  child: const Text('프로필 편집'),
                ),
              ],
            ),
          ),
          // 활동 요약 (실시간)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _StatCard(
                  label: '예약', value: '${rp.all.length}',
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const ReservationScreen())),
                ),
                const SizedBox(width: 8),
                _StatCard(
                  label: '찜한 딜', value: '${wl.count}',
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const WishlistScreen())),
                ),
                const SizedBox(width: 8),
                _StatCard(
                  label: '절약 금액',
                  value: savedAmount > 0 ? '${Formatters.price(savedAmount)}원' : '-',
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const ReservationScreen())),
                ),
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
            _MenuItem(
              icon: LucideIcons.star, label: '내가 쓴 리뷰',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const MyReviewsScreen())),
            ),
          ]),
          _SectionDivider(),
          _MenuSection(title: '설정', items: [
            _MenuItem(
              icon: LucideIcons.mapPin, label: '내 동네 설정',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const LocationSettingsScreen())),
            ),
            _MenuItem(
              icon: LucideIcons.bell, label: '알림 설정',
              onTap: () => _showNotificationSettings(context),
            ),
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
            _MenuItem(
              icon: LucideIcons.helpCircle, label: '고객센터',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const CustomerServiceScreen())),
            ),
            _MenuItem(
              icon: LucideIcons.logOut, label: '로그아웃', isDestructive: true,
              onTap: () => _showLogoutDialog(context),
            ),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

// ── 프로필 아바타 위젯 ──────────────────────────────────────────
class _ProfileAvatar extends StatelessWidget {
  final ProfileProvider profile;
  const _ProfileAvatar({required this.profile});

  @override
  Widget build(BuildContext context) {
    final url = profile.photoUrl;
    if (url != null && url.isNotEmpty) {
      return CircleAvatar(
        radius: 30,
        backgroundImage: CachedNetworkImageProvider(url),
      );
    }
    return CircleAvatar(
      radius: 30,
      backgroundColor: profile.avatarColor.withValues(alpha: 0.15),
      child: Text(
        profile.name.isNotEmpty ? profile.name[0] : '동',
        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: profile.avatarColor),
      ),
    );
  }
}

// ── 프로필 편집 바텀시트 ────────────────────────────────────────
void _showProfileEdit(BuildContext context) {
  final profile = context.read<ProfileProvider>();
  final nameCtrl = TextEditingController(text: profile.name);
  int selectedAvatar = profile.avatarIndex;
  File? pickedFile;
  bool uploading = false;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => StatefulBuilder(
      builder: (ctx, setSheetState) {
        Future<void> pickImage(ImageSource source) async {
          final xFile = await ImagePicker().pickImage(
              source: source, imageQuality: 80, maxWidth: 400);
          if (xFile == null) return;
          setSheetState(() { pickedFile = File(xFile.path); });
        }

        return Padding(
          padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 20),
              const Text('프로필 편집', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),
              // 아바타 + 사진 업로드
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: ProfileProvider.allAvatarColors[selectedAvatar].withValues(alpha: 0.15),
                      backgroundImage: pickedFile != null ? FileImage(pickedFile!) : null,
                      child: pickedFile == null && (profile.photoUrl == null || profile.photoUrl!.isEmpty)
                          ? Text(nameCtrl.text.isNotEmpty ? nameCtrl.text[0] : '동',
                              style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800,
                                  color: ProfileProvider.allAvatarColors[selectedAvatar]))
                          : (pickedFile == null && profile.photoUrl != null
                              ? null : null),
                    ),
                    if (pickedFile == null && profile.photoUrl != null && profile.photoUrl!.isNotEmpty)
                      Positioned.fill(child: CircleAvatar(
                          radius: 40,
                          backgroundImage: CachedNetworkImageProvider(profile.photoUrl!))),
                    Positioned(
                      right: 0, bottom: 0,
                      child: GestureDetector(
                        onTap: () => showModalBottomSheet(
                          context: ctx,
                          builder: (_) => SafeArea(
                            child: Column(mainAxisSize: MainAxisSize.min, children: [
                              ListTile(leading: const Icon(Icons.photo_library),
                                  title: const Text('갤러리에서 선택'),
                                  onTap: () { Navigator.pop(ctx); pickImage(ImageSource.gallery); }),
                              ListTile(leading: const Icon(Icons.camera_alt),
                                  title: const Text('카메라로 촬영'),
                                  onTap: () { Navigator.pop(ctx); pickImage(ImageSource.camera); }),
                            ]),
                          ),
                        ),
                        child: Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                              color: AppColors.primary, shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2)),
                          child: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // 색상 선택
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(ProfileProvider.allAvatarColors.length, (i) =>
                  GestureDetector(
                    onTap: () => setSheetState(() => selectedAvatar = i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      width: selectedAvatar == i ? 34 : 26,
                      height: selectedAvatar == i ? 34 : 26,
                      decoration: BoxDecoration(
                        color: ProfileProvider.allAvatarColors[i],
                        shape: BoxShape.circle,
                        border: selectedAvatar == i ? Border.all(color: Colors.white, width: 3) : null,
                        boxShadow: selectedAvatar == i ? [BoxShadow(
                            color: ProfileProvider.allAvatarColors[i].withValues(alpha: 0.5),
                            blurRadius: 8, spreadRadius: 1)] : null,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: nameCtrl,
                autofocus: true,
                maxLength: 12,
                onChanged: (_) => setSheetState(() {}),
                decoration: InputDecoration(
                  labelText: '닉네임',
                  hintText: '이름을 입력해주세요',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  counterText: '',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: uploading ? null : () async {
                    setSheetState(() => uploading = true);
                    final profile = context.read<ProfileProvider>();
                    if (pickedFile != null) {
                      await profile.uploadPhoto(pickedFile!);
                    }
                    await profile.update(
                        name: nameCtrl.text, avatarIndex: selectedAvatar);
                    if (context.mounted) Navigator.pop(context);
                  },
                  child: uploading
                      ? const SizedBox(width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('저장', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        );
      },
    ),
  );
}

// ── 동네 인증 바텀시트 ──────────────────────────────────────────
void _showVerifySheet(BuildContext context, ProfileProvider profile, LocationProvider location) {
  showModalBottomSheet(
    context: context,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) {
      VerifyResult? result;
      bool loading = false;
      String? verifiedDong; // 인증된 동 이름 (성공 시 표시)

      return StatefulBuilder(
        builder: (ctx, setSheetState) {
          return Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 24),
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.1),
                      shape: BoxShape.circle),
                  child: const Icon(Icons.location_on, size: 32, color: Color(0xFF10B981)),
                ),
                const SizedBox(height: 16),
                Text(
                  result == VerifyResult.success && verifiedDong != null
                      ? '$verifiedDong 인증 완료'
                      : '동네 인증',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  profile.verifiedNeighborhood != null
                      ? '현재 인증된 동네: ${profile.verifiedNeighborhood}'
                      : 'GPS로 현재 위치를 확인해 동네를 인증해요\n대한민국 어디서든 사용 가능해요',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Colors.grey[500], height: 1.5),
                ),
                // 결과 카드
                if (result == VerifyResult.success && verifiedDong != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.verified, color: Color(0xFF10B981), size: 18),
                        const SizedBox(width: 8),
                        Text('$verifiedDong 주민 인증 완료!',
                            style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF10B981))),
                      ],
                    ),
                  ),
                ],
                if (result == VerifyResult.unknownNeighborhood) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.cancel, color: Colors.red, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text('위치를 가져올 수 없어요.\n위치 권한을 확인해주세요.',
                              style: TextStyle(fontWeight: FontWeight.w600, color: Colors.red)),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity, height: 52,
                  child: ElevatedButton(
                    onPressed: (loading || result == VerifyResult.success)
                        ? null
                        : () async {
                            setSheetState(() { loading = true; result = null; verifiedDong = null; });
                            // requestLocation이 내부에서 역지오코딩 후 neighborhood 갱신
                            await location.requestLocation();
                            final pos = location.position;
                            if (pos == null) {
                              setSheetState(() { loading = false; result = VerifyResult.unknownNeighborhood; });
                              return;
                            }
                            if (!ctx.mounted) return;
                            final r = await ctx
                                .read<ProfileProvider>()
                                .verifyNeighborhood(
                                  lat: pos.latitude,
                                  lng: pos.longitude,
                                );
                            setSheetState(() {
                              loading = false;
                              result = r;
                              verifiedDong = r == VerifyResult.success ? location.neighborhood : null;
                            });
                            if (r == VerifyResult.success) {
                              Future.delayed(const Duration(seconds: 1), () {
                                if (ctx.mounted) Navigator.pop(ctx);
                              });
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                    ),
                    child: loading
                        ? const SizedBox(width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(
                            profile.verifiedNeighborhood != null ? '다시 인증하기' : '현재 위치로 인증하기',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          );
        },
      );
    },
  );
}

// ── 알림 설정 바텀시트 ───────────────────────────────────────────
void _showNotificationSettings(BuildContext context) {
  bool dealAlert = true;
  bool pickupReminder = true;
  bool marketingAlert = false;

  showModalBottomSheet(
    context: context,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => StatefulBuilder(
      builder: (ctx, setState) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            const Text('알림 설정', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            SwitchListTile(
              value: dealAlert,
              onChanged: (v) {
                HapticFeedback.lightImpact();
                setState(() => dealAlert = v);
              },
              title: const Text('새 딜 알림', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              subtitle: Text('인근 새 딜 등록 시 알림', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              activeThumbColor: AppColors.primary,
              contentPadding: EdgeInsets.zero,
            ),
            SwitchListTile(
              value: pickupReminder,
              onChanged: (v) {
                HapticFeedback.lightImpact();
                setState(() => pickupReminder = v);
              },
              title: const Text('픽업 리마인더', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              subtitle: Text('픽업 마감 30분 전 알림', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              activeThumbColor: AppColors.primary,
              contentPadding: EdgeInsets.zero,
            ),
            SwitchListTile(
              value: marketingAlert,
              onChanged: (v) {
                HapticFeedback.lightImpact();
                setState(() => marketingAlert = v);
              },
              title: const Text('마케팅 알림', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              subtitle: Text('이벤트 및 혜택 정보', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              activeThumbColor: AppColors.primary,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 8),
            // [Claude | 2026-08-21] 수정범위: _showNotificationSettings() 스위치 3개 — onChanged에 HapticFeedback.lightImpact() 추가
          ],
        ),
      ),
    ),
  );
}

// ── 로그아웃 확인 다이얼로그 ────────────────────────────────────
void _showLogoutDialog(BuildContext context) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('로그아웃', style: TextStyle(fontWeight: FontWeight.w700)),
      content: const Text('정말 로그아웃 하시겠어요?',
          style: TextStyle(fontSize: 14, color: Colors.grey)),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('취소', style: TextStyle(color: Colors.grey)),
        ),
        TextButton(
          onPressed: () async {
            Navigator.pop(ctx);
            await context.read<AuthProvider>().signOut();
            if (!context.mounted) return;
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
              (_) => false,
            );
          },
          child: const Text('로그아웃',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.w700)),
        ),
      ],
    ),
  );
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
  final VoidCallback? onTap;
  const _StatCard({required this.label, required this.value, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
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
