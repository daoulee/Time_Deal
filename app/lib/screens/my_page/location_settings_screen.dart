import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/theme/app_colors.dart';

class LocationSettingsScreen extends StatefulWidget {
  const LocationSettingsScreen({super.key});

  @override
  State<LocationSettingsScreen> createState() => _LocationSettingsScreenState();
}

class _LocationSettingsScreenState extends State<LocationSettingsScreen> {
  late String _selected;
  final _ctrl = TextEditingController();
  bool _initialized = false;
  String _query = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _selected = context.read<LocationProvider>().neighborhood;
      _initialized = true;
    }
  }

  final _neighborhoods = [
    '성수동 1가', '성수동 2가', '뚝섬로', '서울숲길',
    '왕십리', '마장동', '행당동', '사근동',
  ];

  List<String> get _filtered => _query.isEmpty
      ? _neighborhoods
      : _neighborhoods.where((n) => n.contains(_query)).toList();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('내 동네 설정', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          TextButton(
            onPressed: () {
              context.read<LocationProvider>().setNeighborhood(_selected);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('동네가 "$_selected"으로 설정됐어요'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
              Navigator.pop(context);
            },
            child: const Text('저장', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 현재 위치
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      Icon(LucideIcons.locateFixed, size: 18, color: AppColors.primary),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('현재 위치 사용',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                            Text('GPS로 자동 감지합니다',
                                style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                      Icon(LucideIcons.chevronRight, size: 16, color: AppColors.primary),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // 검색창
                TextField(
                  controller: _ctrl,
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: '동네 이름으로 검색',
                    hintStyle: TextStyle(fontSize: 14, color: Colors.grey[400]),
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
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.3)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
            child: Text('근처 동네', style: TextStyle(fontSize: 12,
                fontWeight: FontWeight.w600, color: Colors.grey[400])),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final name = _filtered[i];
                final isSelected = name == _selected;
                return ListTile(
                  onTap: () => setState(() => _selected = name),
                  leading: Icon(
                    LucideIcons.mapPin,
                    size: 18,
                    color: isSelected ? AppColors.primary : Colors.grey[400],
                  ),
                  title: Text(name,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                        color: isSelected ? AppColors.primary : null,
                      )),
                  trailing: isSelected
                      ? Icon(LucideIcons.check, size: 16, color: AppColors.primary)
                      : null,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
