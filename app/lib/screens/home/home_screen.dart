import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/data/mock_data.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../core/providers/theme_provider.dart';
import '../my_page/location_settings_screen.dart';
import '../search/search_screen.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/neighborhood_reverification_dialog.dart';
import 'widgets/deal_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  String _selectedCategory = '전체';
  bool _isCheckingMismatch = false;
  final ScrollController _categoryScrollCtrl = ScrollController();

  static final Map<String, IconData> _categoryIcons = {
    '전체': LucideIcons.sparkles,
    '베이커리': LucideIcons.wheat,
    '음식': LucideIcons.utensils,
    '카페': LucideIcons.coffee,
    '마트': LucideIcons.shoppingBag,
    '꽃집': LucideIcons.flower2,
  };

  late AnimationController _entranceCtrl;
  late Animation<Offset> _bannerSlide;
  late Animation<double> _bannerFade;
  late Animation<double> _categoriesFade;
  late Animation<double> _dealsFade;
  late Animation<Offset> _dealsSlide;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _entranceCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    // [Antigravity | 2026-08-23] 성능 최적화: 화면 진입 애니메이션 중 GPS/역지오코딩 플랫폼 채널 동시 호출로 인한 잔렉(Frame drop) 방지를 위해 지연 실행
    Future.delayed(const Duration(milliseconds: 450), () {
      if (mounted) _initGps();
    });
    _bannerSlide = Tween<Offset>(
      begin: const Offset(0, -0.15),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOutCubic),
      ),
    );
    _bannerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOut),
      ),
    );
    _categoriesFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.15, 0.70, curve: Curves.easeOut),
      ),
    );
    _dealsFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.25, 0.90, curve: Curves.easeOut),
      ),
    );
    _dealsSlide = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entranceCtrl,
        curve: const Interval(0.25, 0.90, curve: Curves.easeOutCubic),
      ),
    );
    _entranceCtrl.forward();
  }

  void _selectCategory(String category) {
    if (_selectedCategory == category) return;
    AppHaptics.selection();
    setState(() => _selectedCategory = category);
    final idx = dealCategories.indexOf(category);
    if (idx != -1 && _categoryScrollCtrl.hasClients) {
      final targetOffset = (idx * 84.0 - 60.0).clamp(
        0.0,
        _categoryScrollCtrl.position.maxScrollExtent,
      );
      _categoryScrollCtrl.animateTo(
        targetOffset,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  void dispose() {
    _categoryScrollCtrl.dispose();
    _entranceCtrl.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _initGps();
    }
  }

  // [Antigravity | 2026-08-23] 수정범위: _initGps() — 앱 시작/복귀 시 이전 접속 동네와 현재 GPS 동네 불일치 감지 시 강제 동네 재인증 모달 호출
  Future<void> _initGps() async {
    if (_isCheckingMismatch) return;
    _isCheckingMismatch = true;

    try {
      final loc = context.read<LocationProvider>();
      final mismatch = await loc.checkNeighborhoodMismatch();
      if (!mounted) return;

      if (mismatch != null && mismatch.hasMismatch) {
        await NeighborhoodReverificationDialog.show(
          context,
          previousNeighborhood: mismatch.previousNeighborhood,
          currentNeighborhood: mismatch.currentNeighborhood,
          position: mismatch.position,
        );
      } else {
        await loc.requestLocation();
        if (!mounted) return;
        final pos = loc.position;
        if (pos != null) {
          context.read<DealProvider>().updateDistances(
            pos.latitude,
            pos.longitude,
            neighborhood: loc.neighborhood,
          );
        }
      }
    } finally {
      _isCheckingMismatch = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final dealProvider = context.watch<DealProvider>();
    final location = context.watch<LocationProvider>();
    final filtered = dealProvider.byCategory(_selectedCategory);
    final isDark = themeProvider.isDark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('우리 동네 타임딜',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            icon: Icon(themeProvider.isDark ? LucideIcons.sun : LucideIcons.moon),
            onPressed: themeProvider.toggle,
          ),
          IconButton(
            icon: Icon(LucideIcons.search),
            onPressed: () => Navigator.push(
                context, MaterialPageRoute(builder: (_) => const SearchScreen())),
          ),
        ],
      ),
      // [Antigravity | 2026-08-23] 수정범위: HomeScreen — 메인 진입 시 위치 배너, 카테고리 알약 세그먼트, 딜 피드의 스태거드 페이드&슬라이드 등장 모션 적용
      body: Column(
        children: [
          // [Antigravity | 2026-08-23] 수정범위: HomeScreen — 위치 배너와 카테고리 알약 세그먼트의 주황빛 소프트 보더 및 배경 일체화
          SlideTransition(
            position: _bannerSlide,
            child: FadeTransition(
              opacity: _bannerFade,
              child: GestureDetector(
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const LocationSettingsScreen())),
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: isDark ? 0.08 : 0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: isDark ? 0.20 : 0.14),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(LucideIcons.mapPin, color: AppColors.primary, size: 16),
                      const SizedBox(width: 6),
                      Text(location.neighborhood, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                      const SizedBox(width: 4),
                      Icon(LucideIcons.chevronDown, size: 16, color: AppColors.primary),
                      const Spacer(),
                      Text('딜 ${dealProvider.deals.length}개 진행중',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? Colors.grey[400] : Colors.grey[500],
                          )),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          // [Antigravity | 2026-08-23] 수정범위: HomeScreen 카테고리 — 좌우 가로 스크롤 독립 칩 바 & 완벽한 텍스트/아이콘 정중앙(Center) 정렬 및 오토스크롤 연동
          FadeTransition(
            opacity: _categoriesFade,
            child: SizedBox(
              height: 40,
              child: ListView.separated(
                controller: _categoryScrollCtrl,
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: dealCategories.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final cat = dealCategories[i];
                  final isSelected = _selectedCategory == cat;
                  final icon = _categoryIcons[cat] ?? LucideIcons.tag;

                  return GestureDetector(
                    onTap: () => _selectCategory(cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOutCubic,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark
                                ? const Color(0xFF1E1F25)
                                : const Color(0xFFF3F4F6)),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : (isDark
                                  ? Colors.white.withValues(alpha: 0.08)
                                  : Colors.black.withValues(alpha: 0.06)),
                          width: 1,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppColors.primary.withValues(
                                    alpha: isDark ? 0.35 : 0.25,
                                  ),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Icon(
                            icon,
                            size: 14,
                            color: isSelected
                                ? Colors.white
                                : (isDark ? Colors.grey[400] : const Color(0xFF6B7280)),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            cat,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected
                                  ? Colors.white
                                  : (isDark ? Colors.grey[300] : const Color(0xFF374151)),
                              height: 1.15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 6),
          // 딜 목록
          // [Antigravity | 2026-08-21] 수정범위: HomeScreen — 카테고리 전환 및 딜 갱신 시 부드러운 AnimatedSwitcher + RefreshIndicator 적용
          Expanded(
            child: SlideTransition(
              position: _dealsSlide,
              child: FadeTransition(
                opacity: _dealsFade,
                child: RefreshIndicator.adaptive(
                  color: AppColors.primary,
                  onRefresh: () async {
                    AppHaptics.selection();
                    await dealProvider.refresh();
                  },
                  child: RepaintBoundary(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 280),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      child: filtered.isEmpty
                          ? const EmptyStateView(
                              key: ValueKey('empty_deals'),
                              icon: Icons.local_offer_outlined,
                              title: '이 카테고리의 딜이 없어요',
                              subtitle: '다른 카테고리를 확인해보세요',
                            )
                          : ListView.builder(
                              key: ValueKey('list_$_selectedCategory'),
                              padding: const EdgeInsets.only(bottom: 96, top: 4),
                              itemCount: filtered.length,
                              itemBuilder: (_, i) => DealCard(
                                deal: filtered[i],
                                index: i,
                              ),
                            ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
