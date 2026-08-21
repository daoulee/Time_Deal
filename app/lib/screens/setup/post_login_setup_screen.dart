import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/providers/location_provider.dart';
import '../../core/providers/profile_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/auth_feedback.dart';
import '../role_select/role_select_screen.dart';

class PostLoginSetupScreen extends StatefulWidget {
  const PostLoginSetupScreen({super.key});

  @override
  State<PostLoginSetupScreen> createState() => _PostLoginSetupScreenState();
}

class _PostLoginSetupScreenState extends State<PostLoginSetupScreen> {
  late final PageController _pageController;
  int _step = 0;

  // Step 0 — nickname
  final _nameCtrl = TextEditingController();
  int _avatarIndex = 0;

  // Step 1 — GPS + radius
  bool _locating = false;
  int _radiusKm = 3;
  List<String> _nearbyDongs = [];
  bool _loadingDongs = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    final profile = context.read<ProfileProvider>();
    _nameCtrl.text = profile.name == '김동네' ? '' : profile.name;
    _avatarIndex = profile.avatarIndex;

    // 화면 렌더 직후 GPS 즉시 요청
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _detectLocation();
      if (mounted) _loadNearbyDongs();
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _pageController.dispose();
    super.dispose();
  }

  void _goToStep(int step) {
    FocusScope.of(context).unfocus();
    if (step == _step) return;
    if (step > _step && _step == 0) _saveName();
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
    setState(() => _step = step);
  }

  void _nextStep() => _step == 0 ? _goToStep(1) : _finish();

  void _saveName() {
    final name = _nameCtrl.text.trim();
    context.read<ProfileProvider>().update(
          name: name.isEmpty ? '김동네' : name,
          avatarIndex: _avatarIndex,
        );
  }

  Future<void> _finish() async {
    final lp = context.read<LocationProvider>();
    await lp.setNeighborhood(lp.neighborhood);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('setup_done', true);
    await prefs.setInt('search_radius_km', _radiusKm);
    if (!mounted) return;

    await AuthFeedback.showSignUpSuccess(
      context,
      message: '동네 설정이 완료되었어요',
      onComplete: () {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (_, _, _) => const RoleSelectScreen(),
            transitionDuration: const Duration(milliseconds: 150),
            transitionsBuilder: (_, anim, _, child) => FadeTransition(opacity: anim, child: child),
          ),
        );
      },
    );
  }

  Future<void> _detectLocation() async {
    if (_locating) return;
    setState(() => _locating = true);
    await context.read<LocationProvider>().requestLocation();
    if (!mounted) return;
    setState(() => _locating = false);
  }

  Future<void> _loadNearbyDongs() async {
    final pos = context.read<LocationProvider>().position;
    if (pos == null) return;
    setState(() {
      _loadingDongs = true;
      _nearbyDongs = [];
    });
    final dongs = await _fetchNearbyDongs(pos.latitude, pos.longitude, _radiusKm);
    if (!mounted) return;
    setState(() {
      _nearbyDongs = dongs;
      _loadingDongs = false;
    });
  }

  // 반경 내 샘플 포인트 → 역지오코딩 → 동 이름 목록
  static ({double lat, double lng}) _offsetPoint(
      double lat, double lng, double distKm, double bearingDeg) {
    const R = 6371.0;
    final d = distKm / R;
    final b = bearingDeg * pi / 180;
    final lat1 = lat * pi / 180;
    final lng1 = lng * pi / 180;
    final lat2 = asin(sin(lat1) * cos(d) + cos(lat1) * sin(d) * cos(b));
    final lng2 = lng1 +
        atan2(sin(b) * sin(d) * cos(lat1), cos(d) - sin(lat1) * sin(lat2));
    return (lat: lat2 * 180 / pi, lng: lng2 * 180 / pi);
  }

  static Future<List<String>> _fetchNearbyDongs(
      double lat, double lng, int radiusKm) async {
    final seen = <String>{};

    // 중심 동네
    final center = await LocationProvider.reverseGeocode(lat, lng);
    if (center != null && center.isNotEmpty) seen.add(center);

    // N / E / S / W 끝점
    for (final bearing in [0.0, 90.0, 180.0, 270.0]) {
      final pt = _offsetPoint(lat, lng, radiusKm.toDouble(), bearing);
      final dong = await LocationProvider.reverseGeocode(pt.lat, pt.lng);
      if (dong != null && dong.isNotEmpty) seen.add(dong);
    }

    return seen.toList()..sort();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: PageView(
          controller: _pageController,
          physics: const ClampingScrollPhysics(),
          onPageChanged: (i) {
            if (i != _step) {
              if (i > _step && _step == 0) _saveName();
              setState(() => _step = i);
            }
          },
          children: [
            _NicknameStep(
              nameCtrl: _nameCtrl,
              avatarIndex: _avatarIndex,
              onAvatarChanged: (i) => setState(() => _avatarIndex = i),
              onNext: _nextStep,
              onStepTap: _goToStep,
            ),
            _RegionStep(
              locating: _locating,
              radiusKm: _radiusKm,
              nearbyDongs: _nearbyDongs,
              loadingDongs: _loadingDongs,
              onRadiusChanged: (r) {
                setState(() {
                  _radiusKm = r;
                  _nearbyDongs = [];
                });
                _loadNearbyDongs();
              },
              onFinish: _nextStep,
              onStepTap: _goToStep,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Step 0: 닉네임 ──────────────────────────────────────────────────────────

class _NicknameStep extends StatelessWidget {
  final TextEditingController nameCtrl;
  final int avatarIndex;
  final ValueChanged<int> onAvatarChanged;
  final VoidCallback onNext;
  final ValueChanged<int>? onStepTap;

  const _NicknameStep({
    required this.nameCtrl,
    required this.avatarIndex,
    required this.onAvatarChanged,
    required this.onNext,
    this.onStepTap,
  });

  static final _colors = ProfileProvider.allAvatarColors;

  @override
  Widget build(BuildContext context) {
    final color = _colors[avatarIndex % _colors.length];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          _StepDots(current: 0, onStepTap: onStepTap),
          const Spacer(flex: 2),
          Center(
            child: CircleAvatar(
              radius: 44,
              backgroundColor: color.withValues(alpha: 0.15),
              child: Text(
                nameCtrl.text.isEmpty ? '?' : nameCtrl.text.characters.first,
                style: TextStyle(
                    fontSize: 36, fontWeight: FontWeight.w700, color: color),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text('반가워요!',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('어떻게 불러드릴까요?',
              style: TextStyle(fontSize: 16, color: Colors.grey[500])),
          const SizedBox(height: 28),
          _NameField(controller: nameCtrl),
          const SizedBox(height: 24),
          Text('색상 선택',
              style: TextStyle(fontSize: 13, color: Colors.grey[500])),
          const SizedBox(height: 10),
          Row(
            children: List.generate(_colors.length, (i) {
              final c = _colors[i];
              final selected = i == avatarIndex;
              return GestureDetector(
                onTap: () => onAvatarChanged(i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(right: 10),
                  width: selected ? 38 : 32,
                  height: selected ? 38 : 32,
                  decoration: BoxDecoration(
                    color: c,
                    shape: BoxShape.circle,
                    border: selected
                        ? Border.all(color: Colors.white, width: 3)
                        : null,
                    boxShadow: selected
                        ? [BoxShadow(color: c.withValues(alpha: 0.5), blurRadius: 8)]
                        : null,
                  ),
                  child: selected
                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                      : null,
                ),
              );
            }),
          ),
          const Spacer(flex: 3),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: onNext,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('다음',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  Icon(LucideIcons.arrowRight, size: 18),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class _NameField extends StatefulWidget {
  final TextEditingController controller;
  const _NameField({required this.controller});

  @override
  State<_NameField> createState() => _NameFieldState();
}

class _NameFieldState extends State<_NameField> {
  void _rebuild() => setState(() {});

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_rebuild);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_rebuild);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      autofocus: false,
      maxLength: 12,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: '닉네임 입력 (최대 12자)',
        hintStyle: TextStyle(
            fontSize: 15,
            color: Colors.grey[400],
            fontWeight: FontWeight.w400),
        counterText: '',
        suffixIcon: widget.controller.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: () => widget.controller.clear(),
              )
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide:
              BorderSide(color: Colors.grey.withValues(alpha: 0.25)),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(14)),
          borderSide: BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}

// ─── Step 1: GPS 위치 + 반경 선택 ────────────────────────────────────────────

class _RegionStep extends StatelessWidget {
  final bool locating;
  final int radiusKm;
  final List<String> nearbyDongs;
  final bool loadingDongs;
  final ValueChanged<int> onRadiusChanged;
  final VoidCallback onFinish;
  final ValueChanged<int>? onStepTap;

  const _RegionStep({
    required this.locating,
    required this.radiusKm,
    required this.nearbyDongs,
    required this.loadingDongs,
    required this.onRadiusChanged,
    required this.onFinish,
    this.onStepTap,
  });

  static const _radii = [1, 3, 5];
  static const _radiusDesc = {
    1: '도보 15분',
    3: '자전거 10분',
    5: '차로 10분',
  };

  @override
  Widget build(BuildContext context) {
    final bgColor = Theme.of(context).scaffoldBackgroundColor;
    final lp = context.watch<LocationProvider>();
    final neighborhood = lp.neighborhood;
    final position = lp.position;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Stack(
            children: [
              SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 20, 28, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StepDots(current: 1, onStepTap: onStepTap),
                    const SizedBox(height: 28),
                    const Text('내 현재 위치',
                        style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            height: 1.2)),
                    const SizedBox(height: 8),
                    Text('GPS 기반 자동 감지 · 수동 변경 불가',
                        style: TextStyle(
                            fontSize: 15, color: Colors.grey[500])),
                    const SizedBox(height: 20),
                    // GPS 위치 박스
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color:
                                AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          if (locating)
                            const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary),
                            )
                          else
                            Icon(LucideIcons.locateFixed,
                                size: 20, color: AppColors.primary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  locating ? 'GPS 위치 감지 중...' : neighborhood,
                                  style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'GPS 자동 감지 · 수동 변경 불가 (부정사용 방지)',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          if (!locating)
                            Icon(LucideIcons.check,
                                size: 16, color: AppColors.primary),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    // 반경 선택 라벨
                    Row(
                      children: [
                        Icon(LucideIcons.mapPin,
                            size: 13, color: AppColors.textSecondary),
                        const SizedBox(width: 5),
                        const Text('딜 탐색 반경',
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: _radii.map((km) {
                        final selected = km == radiusKm;
                        return GestureDetector(
                          onTap: () => onRadiusChanged(km),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.only(right: 10),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 12),
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.primary
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: selected
                                    ? AppColors.primary
                                    : Colors.grey.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Column(
                              children: [
                                Text('${km}km',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: selected
                                          ? Colors.white
                                          : Colors.grey[700],
                                    )),
                                const SizedBox(height: 2),
                                Text(_radiusDesc[km]!,
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: selected
                                          ? Colors.white
                                              .withValues(alpha: 0.8)
                                          : Colors.grey[400],
                                    )),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    // 반경 내 동네 목록
                    _DongChips(
                      dongs: nearbyDongs,
                      loading: loadingDongs,
                      radiusKm: radiusKm,
                    ),
                    const SizedBox(height: 20),
                    // 반경 미니 지도
                    if (position != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: SizedBox(
                          key: ValueKey(radiusKm),
                          height: 200,
                          child: GoogleMap(
                            initialCameraPosition: CameraPosition(
                              target: LatLng(position.latitude, position.longitude),
                              zoom: radiusKm == 1 ? 14.5 : radiusKm == 3 ? 13.0 : 12.0,
                            ),
                            circles: {
                              Circle(
                                circleId: const CircleId('r'),
                                center: LatLng(position.latitude, position.longitude),
                                radius: radiusKm * 1000.0,
                                fillColor: AppColors.primary.withValues(alpha: 0.08),
                                strokeColor: AppColors.primary,
                                strokeWidth: 2,
                              ),
                            },
                            markers: {
                              Marker(
                                markerId: const MarkerId('me'),
                                position: LatLng(position.latitude, position.longitude),
                              ),
                            },
                            myLocationEnabled: false,
                            myLocationButtonEnabled: false,
                            zoomControlsEnabled: false,
                            mapToolbarEnabled: false,
                            scrollGesturesEnabled: false,
                            zoomGesturesEnabled: false,
                            rotateGesturesEnabled: false,
                            tiltGesturesEnabled: false,
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
              // 상단 fade 그라데이션
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: IgnorePointer(
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          bgColor,
                          bgColor.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(28, 8, 28, 20),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: locating ? null : onFinish,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${radiusKm}km 이내 딜 보러가기',
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  Icon(LucideIcons.zap, size: 18),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── 반경 내 동네 칩 ─────────────────────────────────────────────────────────

class _DongChips extends StatelessWidget {
  final List<String> dongs;
  final bool loading;
  final int radiusKm;

  const _DongChips({
    required this.dongs,
    required this.loading,
    required this.radiusKm,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Row(
        children: [
          const SizedBox(
            width: 13,
            height: 13,
            child: CircularProgressIndicator(
                strokeWidth: 1.5, color: AppColors.primary),
          ),
          const SizedBox(width: 8),
          Text('포함 동네 불러오는 중...',
              style: TextStyle(fontSize: 12, color: Colors.grey[400])),
        ],
      );
    }
    if (dongs.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${radiusKm}km 이내 포함 동네 (${dongs.length}개)',
          style: TextStyle(
              fontSize: 12,
              color: Colors.grey[500],
              fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: dongs
              .map((dong) => Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color:
                              AppColors.primary.withValues(alpha: 0.18)),
                    ),
                    child: Text(dong,
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w500)),
                  ))
              .toList(),
        ),
      ],
    );
  }
}

// ─── 공통: 단계 인디케이터 ────────────────────────────────────────────────────

class _StepDots extends StatelessWidget {
  final int current;
  final ValueChanged<int>? onStepTap;
  const _StepDots({required this.current, this.onStepTap});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(
        2,
        (i) => GestureDetector(
          onTap: () => onStepTap?.call(i),
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: const EdgeInsets.only(right: 6, top: 8, bottom: 8),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: i == current ? 24 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: i == current
                    ? AppColors.primary
                    : Colors.grey.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
