// [Antigravity | 2026-08-23] 수정범위: LocationSettingsScreen — [가까운 순 ↔ 먼 순] 부드러운 슬라이딩 세그먼트 애니메이션 & 동네 카드 박스 여백 및 간격(Spacing) 최적화
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/data/korean_dongs.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../widgets/sliding_segmented_control.dart';

class LocationSettingsScreen extends StatefulWidget {
  const LocationSettingsScreen({super.key});

  @override
  State<LocationSettingsScreen> createState() => _LocationSettingsScreenState();
}

class _LocationSettingsScreenState extends State<LocationSettingsScreen> {
  late String _selected;
  late int _selectedRadius;
  final _ctrl = TextEditingController();
  bool _initialized = false;
  bool _locating = false;
  bool _loadingNearby = false;
  bool _sortAscending = true; // true: 가까운 순, false: 먼 순
  String _query = '';
  List<NearbyDong> _nearbyDongs = [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final loc = context.read<LocationProvider>();
      _selected = loc.neighborhood;
      _selectedRadius = loc.radiusKm;
      _initialized = true;
      _loadNearbyForCurrentState();
    }
  }

  void _loadNearbyForCurrentState() {
    final loc = context.read<LocationProvider>();
    final pos = loc.position;
    final center = loc.mapCenter;
    final lat = pos?.latitude ?? center.lat;
    final lng = pos?.longitude ?? center.lng;
    _loadNearbyDongs(lat, lng, _selectedRadius);
  }

  Future<void> _loadNearbyDongs(double lat, double lng, int radiusKm) async {
    setState(() => _loadingNearby = true);
    final dongs = await LocationProvider.fetchNearbyDongsDetailed(lat, lng, radiusKm);
    if (!mounted) return;
    setState(() {
      _nearbyDongs = dongs;
      _loadingNearby = false;
    });
  }

  List<NearbyDong> get _filtered {
    var list = _query.isEmpty
        ? List<NearbyDong>.from(_nearbyDongs)
        : _nearbyDongs
            .where((d) => d.name.contains(_query) || d.district.contains(_query))
            .toList();

    if (_sortAscending) {
      list.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
    } else {
      list.sort((a, b) => b.distanceKm.compareTo(a.distanceKm));
    }
    return list;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1B1C22) : Colors.white;
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.06);

    final dealProvider = context.watch<DealProvider>();
    final activeDeals = dealProvider.deals
        .where((d) => !d.isExpired && d.remainingStock > 0)
        .toList();

    int countDealsForDong(String dongName) {
      final clean = dongName.replaceAll(RegExp(r'(\d+가|\d+동|\s.*)'), '');
      return activeDeals.where((d) {
        return d.neighborhood == dongName ||
            d.storeName.contains(dongName) ||
            (clean.isNotEmpty && d.storeName.contains(clean)) ||
            d.title.contains(dongName);
      }).length;
    }

    final radiusOptions = const [1, 3, 5, 10];
    final radiusIndex = radiusOptions.indexOf(_selectedRadius).clamp(0, 3);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121316) : const Color(0xFFF7F8FA),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF121316) : Colors.white,
        elevation: 0,
        title: const Text(
          '내 동네 및 반경 설정',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: Icon(LucideIcons.arrowLeft, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              AppHaptics.selection();
              final locationProvider = context.read<LocationProvider>();
              final messenger = ScaffoldMessenger.of(context);
              final navigator = Navigator.of(context);
              final selected = _selected;
              final r = _selectedRadius;

              await locationProvider.setNeighborhood(selected);
              await locationProvider.setRadiusKm(r);

              if (!mounted) return;
              messenger.showSnackBar(
                SnackBar(
                  content: Text('동네가 "$selected" (탐색 반경 ${r}km)으로 설정되었습니다'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
              navigator.pop();
            },
            child: const Text(
              '저장',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
                fontSize: 15,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            color: isDark ? const Color(0xFF1B1C22) : Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. 현재 GPS 위치 사용 버튼
                GestureDetector(
                  onTap: _locating
                      ? null
                      : () async {
                          AppHaptics.selection();
                          setState(() => _locating = true);
                          final locationProvider = context.read<LocationProvider>();
                          final messenger = ScaffoldMessenger.of(context);
                          await locationProvider.requestLocation();
                          if (!mounted) return;
                          final dong = locationProvider.neighborhood;
                          setState(() {
                            _selected = dong;
                            _locating = false;
                          });
                          final pos = locationProvider.position;
                          if (pos != null) {
                            _loadNearbyDongs(pos.latitude, pos.longitude, _selectedRadius);
                          }
                          if (!mounted) return;
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text('현재 GPS 위치 감지: $dong'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF23242B)
                          : AppColors.primary.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: isDark ? 0.35 : 0.22),
                      ),
                    ),
                    child: Row(
                      children: [
                        _locating
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary,
                                ),
                              )
                            : Icon(LucideIcons.locateFixed, size: 18, color: AppColors.primary),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '현재 위치로 동네 찾기',
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : const Color(0xFF212529),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'GPS를 기반으로 현재 위치의 행정동을 자동 설정합니다',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(LucideIcons.chevronRight, size: 16, color: AppColors.primary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 2. 동네 탐색 반경 슬라이딩 선택기 (1km / 3km / 5km / 10km)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '동네 탐색 반경',
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF212529),
                      ),
                    ),
                    Text(
                      '0km ~ ${_selectedRadius}km 이내 전체 동네',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SlidingSegmentedControl(
                  segments: const ['1km', '3km', '5km', '10km'],
                  selectedIndex: radiusIndex,
                  height: 38,
                  margin: EdgeInsets.zero,
                  backgroundColor: isDark
                      ? const Color(0xFF23242B)
                      : const Color(0xFFECEEF2),
                  borderColor: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.05),
                  onValueChanged: (idx) {
                    AppHaptics.selection();
                    final newR = radiusOptions[idx];
                    setState(() => _selectedRadius = newR);
                    final loc = context.read<LocationProvider>();
                    final pos = loc.position;
                    final center = loc.mapCenter;
                    final lat = pos?.latitude ?? center.lat;
                    final lng = pos?.longitude ?? center.lng;
                    _loadNearbyDongs(lat, lng, newR);
                  },
                ),
                const SizedBox(height: 14),

                // 3. 검색창
                TextField(
                  controller: _ctrl,
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: '동네 이름 또는 시·구로 검색',
                    hintStyle: TextStyle(fontSize: 13.5, color: Colors.grey[400]),
                    prefixIcon: Icon(LucideIcons.search, size: 17, color: AppColors.primary),
                    suffixIcon: _query.isNotEmpty
                        ? IconButton(
                            icon: Icon(LucideIcons.x, size: 15),
                            onPressed: () {
                              _ctrl.clear();
                              setState(() => _query = '');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark ? Colors.white12 : Colors.grey.withValues(alpha: 0.25),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark ? Colors.white12 : Colors.grey.withValues(alpha: 0.2),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF23242B) : const Color(0xFFF8F9FA),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
              ],
            ),
          ),

          // 4. 헤더: 반경 내 탐색된 동네 목록 요약 & 부드러운 [가까운 순 ↔ 먼 순] 슬라이딩 정렬 토글
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Text(
                  '반경 ${_selectedRadius}km 이내 동네',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF212529),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '총 ${_filtered.length}개',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                if (_loadingNearby) ...[
                  const SizedBox(width: 8),
                  const SizedBox(
                    width: 11,
                    height: 11,
                    child: CircularProgressIndicator(
                      strokeWidth: 1.5,
                      color: AppColors.primary,
                    ),
                  ),
                ],
                const Spacer(),

                // 부드러운 슬라이딩 알약 세그먼트 (가까운 순 ↔ 먼 순)
                _SmoothSortSlidingSegment(
                  sortAscending: _sortAscending,
                  isDark: isDark,
                  onChanged: (ascending) {
                    AppHaptics.selection();
                    setState(() => _sortAscending = ascending);
                  },
                ),
              ],
            ),
          ),

          // 5. 동네 목록 리스트뷰 (여백이 살아있는 독립 카드 디자인)
          if (!_loadingNearby && _filtered.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
              child: Center(
                child: Column(
                  children: [
                    Icon(LucideIcons.mapPinOff, size: 32, color: Colors.grey[400]),
                    const SizedBox(height: 8),
                    Text(
                      '선택한 반경 내에 검색된 동네가 없습니다',
                      style: TextStyle(fontSize: 13.5, color: Colors.grey[400]),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                itemCount: _filtered.length,
                itemBuilder: (_, i) {
                  final dong = _filtered[i];
                  final isSelected = dong.name == _selected;
                  final dealCount = countDealsForDong(dong.name);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 9),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: isDark ? 0.12 : 0.06)
                          : cardBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary.withValues(alpha: isDark ? 0.60 : 0.45)
                            : borderColor,
                        width: isSelected ? 1.4 : 1.0,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(
                            alpha: isDark ? 0.15 : 0.025,
                          ),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        AppHaptics.selection();
                        setState(() => _selected = dong.name);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 13,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primary.withValues(alpha: 0.15)
                                    : (isDark
                                        ? const Color(0xFF24252D)
                                        : const Color(0xFFF1F3F5)),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Icon(
                                  LucideIcons.mapPin,
                                  size: 15,
                                  color: isSelected
                                      ? AppColors.primary
                                      : Colors.grey[400],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        dong.name,
                                        style: TextStyle(
                                          fontSize: 14.5,
                                          fontWeight: isSelected
                                              ? FontWeight.w800
                                              : FontWeight.w600,
                                          color: isSelected
                                              ? AppColors.primary
                                              : (isDark
                                                  ? Colors.white
                                                  : const Color(0xFF212529)),
                                        ),
                                      ),
                                      if (dong.distanceKm < 0.2) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 5,
                                            vertical: 1.5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF10B981)
                                                .withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text(
                                            '현재 위치',
                                            style: TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w800,
                                              color: Color(0xFF10B981),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    dong.district,
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: isDark
                                          ? Colors.grey[500]
                                          : Colors.grey[400],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),

                            // 1. 거리 뱃지
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF24252C)
                                    : const Color(0xFFECEEF2),
                                borderRadius: BorderRadius.circular(7),
                              ),
                              child: Text(
                                dong.distanceKm < 0.1
                                    ? '0.0km'
                                    : '${dong.distanceKm.toStringAsFixed(1)}km',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected
                                      ? AppColors.primary
                                      : (isDark
                                          ? Colors.grey[400]
                                          : Colors.grey[600]),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),

                            // 2. 거리 바로 옆 실시간 딜 개수 뱃지 (🔥 딜 N개 / 딜 0개)
                            if (dealCount > 0) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 7,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(
                                    alpha: isDark ? 0.20 : 0.10,
                                  ),
                                  borderRadius: BorderRadius.circular(7),
                                  border: Border.all(
                                    color: AppColors.primary.withValues(
                                      alpha: isDark ? 0.35 : 0.25,
                                    ),
                                    width: 0.8,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      LucideIcons.flame,
                                      size: 11,
                                      color: AppColors.primary,
                                    ),
                                    const SizedBox(width: 3),
                                    Text(
                                      '딜 $dealCount개',
                                      style: const TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ] else ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? const Color(0xFF23242B)
                                      : const Color(0xFFF1F3F5),
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: Text(
                                  '딜 0개',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark
                                        ? Colors.grey[500]
                                        : Colors.grey[400],
                                  ),
                                ),
                              ),
                            ],

                            if (isSelected) ...[
                              const SizedBox(width: 10),
                              Icon(
                                LucideIcons.checkCircle2,
                                size: 19,
                                color: AppColors.primary,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 부드러운 슬라이딩 알약 정렬 세그먼트 (가까운 순 ↔ 먼 순)
// ─────────────────────────────────────────────────────────────────────────────
class _SmoothSortSlidingSegment extends StatelessWidget {
  final bool sortAscending;
  final bool isDark;
  final ValueChanged<bool> onChanged;

  const _SmoothSortSlidingSegment({
    required this.sortAscending,
    required this.isDark,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    const totalWidth = 142.0;
    const height = 32.0;
    const padding = 2.5;
    const pillWidth = (totalWidth - padding * 2) / 2;

    return Container(
      width: totalWidth,
      height: height,
      padding: const EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF23242B) : const Color(0xFFECEEF2),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: Stack(
        children: [
          // 부드럽게 좌우로 미끄러지는 화이트/다크 알약 배경
          AnimatedAlign(
            duration: const Duration(milliseconds: 230),
            curve: Curves.easeOutCubic,
            alignment: sortAscending ? Alignment.centerLeft : Alignment.centerRight,
            child: Container(
              width: pillWidth,
              height: height - padding * 2,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF34353F) : Colors.white,
                borderRadius: BorderRadius.circular(7.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 1.5),
                  ),
                ],
              ),
            ),
          ),

          // 상단 터치 레이블 버튼들
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onChanged(true),
                  child: Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.arrowDownNarrowWide,
                          size: 12,
                          color: sortAscending
                              ? AppColors.primary
                              : (isDark ? Colors.grey[400] : Colors.grey[500]),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          '가까운 순',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: sortAscending
                                ? FontWeight.w800
                                : FontWeight.w600,
                            color: sortAscending
                                ? (isDark ? Colors.white : const Color(0xFF212529))
                                : (isDark ? Colors.grey[400] : Colors.grey[500]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onChanged(false),
                  child: Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.arrowUpWideNarrow,
                          size: 12,
                          color: !sortAscending
                              ? AppColors.primary
                              : (isDark ? Colors.grey[400] : Colors.grey[500]),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          '먼 순',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: !sortAscending
                                ? FontWeight.w800
                                : FontWeight.w600,
                            color: !sortAscending
                                ? (isDark ? Colors.white : const Color(0xFF212529))
                                : (isDark ? Colors.grey[400] : Colors.grey[500]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
