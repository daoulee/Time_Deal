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
import 'widgets/deal_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _selectedCategory = '전체';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initGps());
  }

  Future<void> _initGps() async {
    final loc = context.read<LocationProvider>();
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

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final dealProvider = context.watch<DealProvider>();
    final location = context.watch<LocationProvider>();
    final filtered = dealProvider.byCategory(_selectedCategory);

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
      body: Column(
        children: [
          // 위치 배너
          GestureDetector(
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const LocationSettingsScreen())),
            child: Container(
            margin: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.mapPin, color: AppColors.primary, size: 16),
                const SizedBox(width: 6),
                Text(location.neighborhood, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(width: 4),
                Icon(LucideIcons.chevronDown, size: 16, color: AppColors.primary),
                const Spacer(),
                Text('딜 ${dealProvider.deals.length}개 진행중',
                    style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              ],
            ),
          ),
          ),
          const SizedBox(height: 12),
          // 카테고리 칩
          SizedBox(
            height: 36,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: dealCategories.length,
              itemBuilder: (_, i) {
                final cat = dealCategories[i];
                final selected = cat == _selectedCategory;
                return GestureDetector(
                  onTap: () => setState(() => _selectedCategory = cat),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: selected ? AppColors.primary : Colors.grey.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Center(
                      child: Text(cat,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                            color: selected ? Colors.white : Colors.grey[600],
                          )),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          // 딜 목록
          // [Antigravity | 2026-08-21] 수정범위: HomeScreen — 카테고리 전환 및 딜 갱신 시 부드러운 AnimatedSwitcher + RefreshIndicator 적용
          Expanded(
            child: RefreshIndicator.adaptive(
              color: AppColors.primary,
              onRefresh: () async {
                AppHaptics.selection();
                await dealProvider.refresh();
              },
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
        ],
      ),
    );
  }
}
