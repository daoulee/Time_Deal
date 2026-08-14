import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/models/deal.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/empty_state_view.dart';
import '../home/widgets/deal_card.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _ctrl = TextEditingController();
  String _query = '';

  final _recent = ['마감 빵', '꽃다발', '식빵 세트', '아이스 아메리카노'];
  final _popular = ['떡볶이', '베이커리', '카페', '마감 꽃', '마트'];

  List<Deal> _results(List<Deal> allDeals) => allDeals
      .where((d) =>
          d.title.contains(_query) ||
          d.storeName.contains(_query) ||
          d.storeCategory.contains(_query))
      .toList();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          onChanged: (v) => setState(() => _query = v),
          decoration: InputDecoration(
            hintText: '가게명, 딜 이름으로 검색',
            hintStyle: TextStyle(fontSize: 14, color: Colors.grey[400]),
            border: InputBorder.none,
            prefixIcon: Icon(LucideIcons.search, size: 18, color: AppColors.primary),
            suffixIcon: _query.isNotEmpty
                ? IconButton(
                    icon: Icon(LucideIcons.x, size: 16),
                    onPressed: () {
                      _ctrl.clear();
                      setState(() => _query = '');
                    },
                  )
                : null,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소', style: TextStyle(color: AppColors.primary)),
          ),
        ],
      ),
      body: _query.isEmpty
          ? _buildIdle()
          : _buildResults(context.watch<DealProvider>().deals),
    );
  }

  Widget _buildIdle() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _SectionTitle(icon: LucideIcons.clock, label: '최근 검색'),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _recent
              .map((r) => GestureDetector(
                    onTap: () {
                      _ctrl.text = r;
                      setState(() => _query = r);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.withValues(alpha: 0.25)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.clock3, size: 12, color: Colors.grey[400]),
                          const SizedBox(width: 5),
                          Text(r, style: const TextStyle(fontSize: 13)),
                        ],
                      ),
                    ),
                  ))
              .toList(),
        ),
        const SizedBox(height: 28),
        _SectionTitle(icon: LucideIcons.trendingUp, label: '인기 검색어'),
        const SizedBox(height: 10),
        ...List.generate(
          _popular.length,
          (i) => ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: i < 3 ? AppColors.primary.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '${i + 1}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: i < 3 ? AppColors.primary : Colors.grey,
                  ),
                ),
              ),
            ),
            title: Text(_popular[i], style: const TextStyle(fontSize: 14)),
            trailing: Icon(LucideIcons.trendingUp, size: 14,
                color: i < 3 ? AppColors.primary : Colors.grey[300]),
            onTap: () {
              _ctrl.text = _popular[i];
              setState(() => _query = _popular[i]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildResults(List<Deal> allDeals) {
    final results = _results(allDeals);
    if (results.isEmpty) {
      return EmptyStateView(
        icon: LucideIcons.searchX,
        title: '"$_query" 검색 결과가 없어요',
        subtitle: '다른 키워드로 검색해보세요',
      );
    }
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Text('검색 결과 ${results.length}개',
              style: TextStyle(fontSize: 12, color: Colors.grey[500])),
        ),
        ...results.map((d) => DealCard(deal: d)),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionTitle({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 15, color: Colors.grey[500]),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey[500])),
      ],
    );
  }
}
