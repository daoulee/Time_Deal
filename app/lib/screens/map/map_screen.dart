import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/data/mock_data.dart';
import '../../core/models/deal.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../core/utils/formatters.dart';
import '../../widgets/sliding_segmented_control.dart';
import '../deal_detail/deal_detail_screen.dart';

const _darkMapStyle = '''[
  {"elementType":"geometry","stylers":[{"color":"#1a1a2e"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#8ec3b9"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#1a1a2e"}]},
  {"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#2c3e50"}]},
  {"featureType":"poi","stylers":[{"visibility":"off"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#304a7d"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#98a5be"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#0e1626"}]}
]''';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  GoogleMapController? _mapController;
  Deal? _selectedDeal;

  // 동네/GPS 기반 초기 카메라 위치 (initState에서 결정)
  late LatLng _initialCenter;
  LatLng? _prevMapCenter;

  // discount% + isSelected → BitmapDescriptor
  final _iconCache = <String, BitmapDescriptor>{};

  @override
  void initState() {
    super.initState();
    final mc = context.read<LocationProvider>().mapCenter;
    _initialCenter = LatLng(mc.lat, mc.lng);
    _prevMapCenter = _initialCenter;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _preloadIcons(context.read<DealProvider>().deals);
    });
  }

  // ── Custom marker: discount-% circle drawn with dart:ui Canvas ──────────
  Future<void> _preloadIcons(List<Deal> deals) async {
    bool changed = false;
    for (final deal in deals) {
      for (final selected in [false, true]) {
        final key = '${deal.discountPercent}_$selected';
        if (!_iconCache.containsKey(key)) {
          _iconCache[key] = await _buildIcon(deal.discountPercent, selected);
          changed = true;
        }
      }
    }
    if (changed && mounted) setState(() {});
  }

  Future<BitmapDescriptor> _buildIcon(int percent, bool selected) async {
    const size = 72.0;
    final recorder = ui.PictureRecorder();
    final canvas = ui.Canvas(recorder);
    final r = size / 2 - 6;
    final center = ui.Offset(size / 2, size / 2);

    // drop shadow
    canvas.drawCircle(
      center.translate(0, 2),
      r,
      ui.Paint()
        ..color = const ui.Color(0x55000000)
        ..maskFilter = const ui.MaskFilter.blur(ui.BlurStyle.normal, 5),
    );

    // filled circle
    canvas.drawCircle(
      center,
      r,
      ui.Paint()
        ..color =
            selected ? const ui.Color(0xFFCC3700) : const ui.Color(0xFFFF4500),
    );

    // white ring for selected state
    if (selected) {
      canvas.drawCircle(
        center,
        r,
        ui.Paint()
          ..color = const ui.Color(0xCCFFFFFF)
          ..style = ui.PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );
    }

    // discount-% text
    final pb = ui.ParagraphBuilder(
      ui.ParagraphStyle(textAlign: TextAlign.center, fontSize: 17),
    )
      ..pushStyle(ui.TextStyle(
        color: const ui.Color(0xFFFFFFFF),
        fontSize: 17,
        fontWeight: ui.FontWeight.w800,
      ))
      ..addText('$percent%');
    final para = pb.build()
      ..layout(const ui.ParagraphConstraints(width: size));
    canvas.drawParagraph(para, ui.Offset(0, (size - para.height) / 2));

    final img = await recorder
        .endRecording()
        .toImage(size.toInt(), size.toInt());
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(
      bytes!.buffer.asUint8List(),
      imagePixelRatio: 2.0,
    );
  }

  // ── Map coordinate helpers ───────────────────────────────────────────────
  LatLng _coordForDeal(Deal deal) {
    if (deal.storeLat != null && deal.storeLng != null) {
      return LatLng(deal.storeLat!, deal.storeLng!);
    }
    final mc = context.read<LocationProvider>().mapCenter;
    final baseLat = mc.lat;
    final baseLng = mc.lng;
    final offset = mockDealOffsets[deal.id];
    if (offset != null) {
      return LatLng(baseLat + offset.latOffset, baseLng + offset.lngOffset);
    }
    final hash = deal.id.hashCode;
    final latOffset = ((hash % 100) - 50) * 0.00015;
    final lngOffset = ((hash ~/ 100 % 100) - 50) * 0.00015;
    return LatLng(baseLat + latOffset, baseLng + lngOffset);
  }

  Set<Marker> _buildMarkers(List<Deal> deals) {
    return deals.map((deal) {
      final coord = _coordForDeal(deal);
      final isSelected = _selectedDeal?.id == deal.id;
      final iconKey = '${deal.discountPercent}_$isSelected';
      return Marker(
        markerId: MarkerId(deal.id),
        position: coord,
        icon: _iconCache[iconKey] ??
            BitmapDescriptor.defaultMarkerWithHue(
              isSelected ? BitmapDescriptor.hueRed : 16.0,
            ),
        zIndexInt: isSelected ? 2 : 1,
        onTap: () {
          setState(() => _selectedDeal = isSelected ? null : deal);
          _mapController?.animateCamera(
            CameraUpdate.newLatLngZoom(coord, 15.5),
          );
        },
      );
    }).toSet();
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  // ── Selected deal card (always in tree, slide-up animated) ───────────────
  Widget _selectedDealCard() {
    final deal = _selectedDeal;
    if (deal == null) return const SizedBox(height: 180);
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => DealDetailScreen(deal: deal)),
      ).then((_) => setState(() => _selectedDeal = null)),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.14),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child:
                    Icon(deal.icon, color: AppColors.primary, size: 24),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text('${deal.discountPercent}%',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 6),
                      Text(deal.storeName,
                          style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(deal.title,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text('${Formatters.price(deal.discountedPrice)}원',
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary)),
                ],
              ),
            ),
            Icon(LucideIcons.chevronRight,
                size: 18, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }

  int? _prevRadiusKm;

  double _zoomForRadius(int km) {
    switch (km) {
      case 1:
        return 14.3;
      case 3:
        return 13.0;
      case 5:
        return 12.1;
      case 10:
      default:
        return 10.9;
    }
  }

  @override
  Widget build(BuildContext context) {
    final allDeals = context.watch<DealProvider>().deals;
    final loc = context.watch<LocationProvider>();
    final mc = loc.mapCenter;
    final currentCenter = LatLng(mc.lat, mc.lng);

    // [Antigravity | 2026-08-21] 수정범위: build() — 사용자가 설정한 반경(radiusKm) 이내의 딜만 엄격히 필터링
    final radiusLimit = loc.radiusKm.toDouble();
    final deals = allDeals.where((d) => d.distanceKm <= radiusLimit).toList();

    // Realtime으로 새 딜 추가 시 캐시 미스 마커를 채워줌
    final hasMissingIcons = deals.any((d) =>
        !_iconCache.containsKey('${d.discountPercent}_false') ||
        !_iconCache.containsKey('${d.discountPercent}_true'));
    if (hasMissingIcons) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _preloadIcons(deals));
    }

    // 동네 또는 GPS 위치 변경 시 지도 카메라 자동 이동
    if (_prevMapCenter != null && _prevMapCenter != currentCenter) {
      _prevMapCenter = currentCenter;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(currentCenter, _zoomForRadius(loc.radiusKm)),
        );
      });
    }

    // 반경 변경 시 카메라 줌 자동 조절
    if (_prevRadiusKm != null && _prevRadiusKm != loc.radiusKm) {
      _prevRadiusKm = loc.radiusKm;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(currentCenter, _zoomForRadius(loc.radiusKm)),
        );
      });
    }
    _prevRadiusKm ??= loc.radiusKm;

    return Scaffold(
      body: Stack(
        children: [
          // 구글맵
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _initialCenter,
              zoom: _zoomForRadius(loc.radiusKm),
            ),
            onMapCreated: _onMapCreated,
            style: Theme.of(context).brightness == Brightness.dark
                ? _darkMapStyle
                : null,
            markers: _buildMarkers(deals),
            circles: {
              Circle(
                circleId: const CircleId('user_radius_circle'),
                center: currentCenter,
                radius: loc.radiusKm * 1000.0,
                fillColor: AppColors.primary.withValues(alpha: 0.16),
                strokeColor: AppColors.primary.withValues(alpha: 0.85),
                strokeWidth: 2,
              ),
            },
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: false,
            onTap: (_) => setState(() => _selectedDeal = null),
          ),

          // 상단 검색바 & 반경 선택기
          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: GestureDetector(
                  onTap: () => _showRadiusPicker(
                      context, loc, _mapController, currentCenter, _zoomForRadius),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(LucideIcons.mapPin,
                            size: 16, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text('${loc.neighborhood} · ${loc.radiusKm}km 반경',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(width: 4),
                        Icon(Icons.keyboard_arrow_down_rounded,
                            size: 18, color: Colors.grey[600]),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text('${deals.length}개',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // 선택된 딜 카드 — 슬라이드 업 애니메이션
          AnimatedPositioned(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            bottom: _selectedDeal != null ? 245 : -240,
            left: 16,
            right: 16,
            child: IgnorePointer(
              ignoring: _selectedDeal == null,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 200),
                opacity: _selectedDeal != null ? 1.0 : 0.0,
                child: _selectedDealCard(),
              ),
            ),
          ),

          // 내 위치 버튼
          Positioned(
            bottom: 238,
            right: 16,
            child: FloatingActionButton.small(
              heroTag: 'locate',
              onPressed: () {
                final mc2 = context.read<LocationProvider>().mapCenter;
                _mapController?.animateCamera(
                  CameraUpdate.newLatLngZoom(LatLng(mc2.lat, mc2.lng), 15.0),
                );
              },
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
              foregroundColor: AppColors.primary,
              elevation: 4,
              child: Icon(LucideIcons.locateFixed, size: 20),
            ),
          ),

          // [Antigravity | 2026-08-23] 수정범위: MapScreen — 하단 플로팅 메뉴바 가림 현상 해결 및 스와이프 가능한 DraggableScrollableSheet 연동
          NotificationListener<DraggableScrollableNotification>(
            onNotification: (_) => true,
            child: DraggableScrollableSheet(
              initialChildSize: deals.isEmpty ? 0.32 : 0.32,
              minChildSize: deals.isEmpty ? 0.28 : 0.28,
              maxChildSize: deals.isEmpty ? 0.42 : 0.78,
              snap: true,
              snapSizes: deals.isEmpty ? const [0.32, 0.42] : const [0.32, 0.78],
              builder: (context, scrollController) {
                final isDark = Theme.of(context).brightness == Brightness.dark;
                final bottomPadding = MediaQuery.of(context).padding.bottom;
                final sheetBg = isDark
                    ? const Color(0xFF1B1C22)
                    : Theme.of(context).scaffoldBackgroundColor;

                return Container(
                  decoration: BoxDecoration(
                    color: sheetBg,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(24)),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.06),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.10),
                        blurRadius: 24,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    controller: scrollController,
                    physics: const ClampingScrollPhysics(),
                    padding: EdgeInsets.only(
                      bottom: bottomPadding > 0 ? bottomPadding + 90 : 96,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(height: 10),
                        // 상단 드래그 핸들 바
                        Container(
                          width: 44,
                          height: 4.5,
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey[700] : Colors.grey[300],
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                          child: Row(
                            children: [
                              Text(
                                '근처 딜',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2.5,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '${deals.length}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '${loc.neighborhood} (${loc.radiusKm}km)',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (deals.isEmpty)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                            child: Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.10),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    LucideIcons.mapPinOff,
                                    size: 24,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  '현재 반경 내 진행 중인 타임딜이 없어요',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '반경을 넓히거나 다른 동네를 선택해보세요',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? Colors.grey[400] : Colors.grey[500],
                                  ),
                                ),
                                if (loc.radiusKm < 3.0) ...[
                                  const SizedBox(height: 12),
                                  SizedBox(
                                    height: 36,
                                    child: OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.primary,
                                        side: BorderSide(
                                          color: AppColors.primary.withValues(alpha: 0.4),
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(18),
                                        ),
                                        padding: const EdgeInsets.symmetric(horizontal: 14),
                                      ),
                                      icon: Icon(LucideIcons.maximize2, size: 14),
                                      label: const Text(
                                        '탐색 반경 3km로 넓히기',
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      onPressed: () {
                                        AppHaptics.selection();
                                        loc.setRadiusKm(3);
                                      },
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          )
                        else ...[
                          // 가로 스크롤 프리뷰
                          SizedBox(
                            height: 94,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: deals.length,
                              itemBuilder: (_, i) {
                                final deal = deals[i];
                                final isSelected = _selectedDeal?.id == deal.id;
                                return GestureDetector(
                                  onTap: () {
                                    final coord = _coordForDeal(deal);
                                    setState(() =>
                                        _selectedDeal = isSelected ? null : deal);
                                    _mapController?.animateCamera(
                                      CameraUpdate.newLatLngZoom(coord, 15.5),
                                    );
                                  },
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    width: 160,
                                    margin: const EdgeInsets.only(
                                      right: 10,
                                      bottom: 6,
                                    ),
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isSelected
                                            ? AppColors.primary
                                            : (isDark
                                                ? Colors.white.withValues(alpha: 0.10)
                                                : Colors.grey.withValues(alpha: 0.20)),
                                        width: isSelected ? 2 : 1,
                                      ),
                                      color: isSelected
                                          ? AppColors.primary.withValues(alpha: 0.08)
                                          : (isDark
                                              ? const Color(0xFF24252C)
                                              : Colors.white),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          deal.icon,
                                          size: 22,
                                          color: isSelected
                                              ? AppColors.primary
                                              : (isDark
                                                  ? Colors.white70
                                                  : AppColors.textSecondary),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                deal.title,
                                                style: TextStyle(
                                                  fontSize: 11.5,
                                                  fontWeight: FontWeight.w600,
                                                  color: isSelected
                                                      ? AppColors.primary
                                                      : (isDark
                                                          ? Colors.white
                                                          : null),
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '${Formatters.price(deal.discountedPrice)}원',
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w800,
                                                  color: AppColors.primary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 12),
                          // 확장 시 보여주는 세로 리스트
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Divider(height: 24),
                                Text(
                                  '전체 딜 목록',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                ...deals.map((deal) {
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 10),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? const Color(0xFF24252C)
                                          : const Color(0xFFF7F8FA),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: ListTile(
                                      contentPadding: EdgeInsets.zero,
                                      leading: Icon(deal.icon, color: AppColors.primary),
                                      title: Text(
                                        deal.title,
                                        style: TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 13.5,
                                          color: isDark ? Colors.white : Colors.black87,
                                        ),
                                      ),
                                      subtitle: Text(
                                        '${deal.storeName} · ${deal.distanceKm.toStringAsFixed(1)}km',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                                        ),
                                      ),
                                      trailing: Text(
                                        '${Formatters.price(deal.discountedPrice)}원',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 14,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      onTap: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => DealDetailScreen(deal: deal),
                                          ),
                                        );
                                      },
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ],
                      ],
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

// [Antigravity | 2026-08-23] 수정범위: _showRadiusPicker — StatefulBuilder 연동 및 220ms 시그니처 슬라이딩 알약 애니메이션과 햅틱 적용
void _showRadiusPicker(
  BuildContext context,
  LocationProvider loc,
  GoogleMapController? mapController,
  LatLng center,
  double Function(int) zoomForRadius,
) {
  int currentSelectedIdx = [1, 3, 5, 10].indexOf(loc.radiusKm).clamp(0, 3);
  final isDark = Theme.of(context).brightness == Brightness.dark;

  showModalBottomSheet(
    context: context,
    backgroundColor: isDark ? const Color(0xFF1B1C22) : Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (context, setModalState) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[700] : Colors.grey[300],
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(LucideIcons.radar, size: 18, color: AppColors.primary),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '동네 탐색 반경 설정',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '선택한 반경 내의 딜만 지도와 홈에 표시됩니다',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                SlidingSegmentedControl(
                  segments: const ['1km', '3km', '5km', '10km'],
                  selectedIndex: currentSelectedIdx,
                  height: 48,
                  margin: EdgeInsets.zero,
                  backgroundColor: isDark
                      ? const Color(0xFF24252C)
                      : AppColors.primary.withValues(alpha: 0.05),
                  borderColor: isDark
                      ? AppColors.primary.withValues(alpha: 0.20)
                      : AppColors.primary.withValues(alpha: 0.14),
                  onValueChanged: (idx) {
                    AppHaptics.selection();
                    setModalState(() {
                      currentSelectedIdx = idx;
                    });
                    final r = [1, 3, 5, 10][idx];
                    loc.setRadiusKm(r);
                    mapController?.animateCamera(
                      CameraUpdate.newLatLngZoom(center, zoomForRadius(r)),
                    );
                    Future.delayed(const Duration(milliseconds: 320), () {
                      if (ctx.mounted) Navigator.pop(ctx);
                    });
                  },
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}
