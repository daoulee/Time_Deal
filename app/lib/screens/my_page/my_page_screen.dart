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
import '../../core/utils/app_haptics.dart';
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

    // [Antigravity | 2026-08-21] 수정범위: MyPageScreen — 토스/당근/iOS 스타일 그룹형 카드(Grouped Cards), 컬러풀 아이콘 배지, 에코 절약 배너 전면 모더니제이션
    final isDark = themeProvider.isDark;
    final pageBg = isDark ? const Color(0xFF121316) : const Color(0xFFF6F7F9);
    final cardBg = Theme.of(context).cardTheme.color ?? (isDark ? const Color(0xFF1C1D22) : Colors.white);
    final borderColor = isDark ? Colors.white.withValues(alpha: 0.07) : Colors.black.withValues(alpha: 0.05);

    return Scaffold(
      backgroundColor: pageBg,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: ClipRect(
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: pageBg.withValues(alpha: 0.85),
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.05),
                    width: 0.5,
                  ),
                ),
              ),
              child: AppBar(
                title: const Text('내 정보', style: TextStyle(fontWeight: FontWeight.w800)),
                backgroundColor: Colors.transparent,
                elevation: 0,
                scrolledUnderElevation: 0,
                systemOverlayStyle: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
              ),
            ),
          ),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + kToolbarHeight + 12,
          bottom: 40,
          left: 16,
          right: 16,
        ),
        children: [
          // 1. 프로필 카드
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: borderColor),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    _ProfileAvatar(profile: profile),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(profile.name,
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                              const SizedBox(width: 6),
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
                                      Text('동네인증', style: TextStyle(fontSize: 10,
                                          fontWeight: FontWeight.w700, color: Color(0xFF10B981))),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          GestureDetector(
                            onTap: () => _showVerifySheet(context, profile, location),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '${location.neighborhood.isEmpty ? '우리동네' : location.neighborhood} 주민',
                                  style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                                ),
                                const SizedBox(width: 4),
                                Icon(LucideIcons.chevronRight, size: 12, color: Colors.grey[400]),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // 프로필 편집 버튼
                    GestureDetector(
                      onTap: () => _showProfileEdit(context),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.grey[100],
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          '프로필 수정',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white70 : Colors.grey[700],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // 에코/지구살리기 배너
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Text('🌱', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          savedAmount > 0
                              ? '타임딜로 ${Formatters.price(savedAmount)}원 아끼고 지구도 지켰어요!'
                              : '마감 할인으로 맛있는 음식도 구하고 지구도 지켜보세요!',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF059669),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 2. 활동 요약 3단 스탯
          Row(
            children: [
              _ModernStatCard(
                icon: LucideIcons.calendarCheck,
                label: '예약 내역',
                value: '${rp.all.length}',
                unit: '건',
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ReservationScreen())),
              ),
              const SizedBox(width: 8),
              _ModernStatCard(
                icon: LucideIcons.heart,
                label: '찜한 타임딜',
                value: '${wl.count}',
                unit: '개',
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const WishlistScreen())),
              ),
              const SizedBox(width: 8),
              _ModernStatCard(
                icon: LucideIcons.coins,
                iconColor: AppColors.primary,
                label: '누적 절약',
                value: Formatters.price(savedAmount),
                unit: '원',
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ReservationScreen())),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 3. 내 활동 그룹 카드
          _GroupedSection(
            title: '내 활동',
            cardBg: cardBg,
            borderColor: borderColor,
            items: [
              _GroupedItem(
                icon: LucideIcons.clipboardList,
                title: '예약 내역',
                badgeText: rp.all.isNotEmpty ? '${rp.all.length}' : null,
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ReservationScreen())),
              ),
              _GroupedItem(
                icon: LucideIcons.heart,
                title: '찜 목록',
                badgeText: wl.count > 0 ? '${wl.count}' : null,
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const WishlistScreen())),
              ),
              _GroupedItem(
                icon: LucideIcons.star,
                title: '내가 쓴 리뷰',
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const MyReviewsScreen())),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // 4. 서비스 설정 그룹 카드
          _GroupedSection(
            title: '서비스 설정',
            cardBg: cardBg,
            borderColor: borderColor,
            items: [
              _GroupedItem(
                icon: LucideIcons.mapPin,
                title: '내 동네 설정',
                subtitle: '${location.neighborhood.isEmpty ? '동네 미설정' : location.neighborhood} · ${location.radiusKm}km 반경',
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const LocationSettingsScreen())),
              ),
              _GroupedItem(
                icon: LucideIcons.bell,
                title: '알림 설정',
                subtitle: '새 딜 및 픽업 리마인더',
                onTap: () => _showNotificationSettings(context),
              ),
              _GroupedItem(
                icon: themeProvider.isDark ? LucideIcons.sun : LucideIcons.moon,
                title: '화면 모드',
                trailingText: themeProvider.isDark ? '다크 모드' : '라이트 모드',
                onTap: themeProvider.toggle,
              ),
            ],
          ),
          const SizedBox(height: 18),

          // 5. 기타 및 고객지원 그룹 카드
          _GroupedSection(
            title: '기타 및 지원',
            cardBg: cardBg,
            borderColor: borderColor,
            items: [
              _GroupedItem(
                icon: LucideIcons.store,
                title: '사장님으로 전환',
                subtitle: '마감 딜 등록 및 가게 관리',
                trailingBadge: '사장님 모드',
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const MerchantHomeScreen())),
              ),
              _GroupedItem(
                icon: LucideIcons.headphones,
                title: '고객센터',
                subtitle: '1:1 카카오톡 상담 · 전화문의 · FAQ',
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const CustomerServiceScreen())),
              ),
              _GroupedItem(
                icon: LucideIcons.logOut,
                title: '로그아웃',
                isDestructive: true,
                onTap: () => _showLogoutDialog(context),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // 6. 하단 앱 버전 정보
          Center(
            child: Text(
              '우리 동네 타임딜 v1.0.0\n지구를 지키는 따뜻한 소비',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[400],
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 16),
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

class _ModernStatCard extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final String value;
  final String unit;
  final VoidCallback onTap;

  const _ModernStatCard({
    required this.icon,
    this.iconColor,
    required this.label,
    required this.value,
    required this.unit,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = Theme.of(context).cardTheme.color ?? (isDark ? const Color(0xFF1C1D22) : Colors.white);
    final borderColor = isDark ? Colors.white.withValues(alpha: 0.07) : Colors.black.withValues(alpha: 0.05);
    final effectiveIconColor = iconColor ?? (isDark ? Colors.white70 : const Color(0xFF4E5968));

    return Expanded(
      child: GestureDetector(
        onTap: () {
          AppHaptics.selection();
          onTap();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: effectiveIconColor.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 16, color: effectiveIconColor),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Flexible(
                    child: Text(
                      value,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Text(
                    unit,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GroupedSection extends StatelessWidget {
  final String title;
  final Color cardBg;
  final Color borderColor;
  final List<_GroupedItem> items;

  const _GroupedSection({
    required this.title,
    required this.cardBg,
    required this.borderColor,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: List.generate(items.length, (i) {
              final item = items[i];
              final isLast = i == items.length - 1;
              return Column(
                children: [
                  item,
                  if (!isLast)
                    Padding(
                      padding: const EdgeInsets.only(left: 54, right: 16),
                      child: Divider(
                        height: 1,
                        thickness: 0.5,
                        color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.05),
                      ),
                    ),
                ],
              );
            }),
          ),
        ),
      ],
    );
  }
}

class _GroupedItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? badgeText;
  final String? trailingText;
  final String? trailingBadge;
  final bool isDestructive;
  final VoidCallback onTap;

  const _GroupedItem({
    required this.icon,
    required this.title,
    this.subtitle,
    this.badgeText,
    this.trailingText,
    this.trailingBadge,
    this.isDestructive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor = isDestructive ? const Color(0xFFEF4444) : (isDark ? Colors.white70 : const Color(0xFF4E5968));
    final iconBg = isDestructive
        ? const Color(0xFFEF4444).withValues(alpha: 0.1)
        : (isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.04));
    return InkWell(
      onTap: () {
        AppHaptics.selection();
        onTap();
      },
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Icon(icon, size: 18, color: iconColor),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDestructive ? const Color(0xFFEF4444) : null,
                        ),
                      ),
                      if (badgeText != null) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: iconColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badgeText!,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: iconColor,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (trailingBadge != null)
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  trailingBadge!,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
            if (trailingText != null)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  trailingText!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[500],
                  ),
                ),
              ),
            Icon(
              LucideIcons.chevronRight,
              size: 16,
              color: Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }
}
