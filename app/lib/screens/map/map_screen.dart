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

          // 하단 딜 가로 스크롤
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              padding: const EdgeInsets.only(bottom: 74),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.94),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 20)
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 8),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2)),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        const Text('근처 딜',
                            style: TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10)),
                          child: Text('${deals.length}',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  deals.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          child: Center(
                            child: Text(
                              '현재 반경 내 진행 중인 타임딜이 없어요',
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.grey[500]),
                            ),
                          ),
                        )
                      : SizedBox(
                          height: 92,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
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
                            width: 155,
                            margin: const EdgeInsets.only(
                                right: 10, bottom: 12),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : Colors.grey.withValues(alpha: 0.2),
                                width: isSelected ? 2 : 1,
                              ),
                              color: isSelected
                                  ? AppColors.primary
                                      .withValues(alpha: 0.05)
                                  : Theme.of(context).cardTheme.color,
                            ),
                            child: Row(
                              children: [
                                Icon(deal.icon,
                                    size: 22,
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.textSecondary),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisAlignment:
                                        MainAxisAlignment.center,
                                    children: [
                                      Text(deal.title,
                                          style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: isSelected
                                                  ? AppColors.primary
                                                  : null),
                                          maxLines: 1,
                                          overflow:
                                              TextOverflow.ellipsis),
                                      const SizedBox(height: 2),
                                      Text(
                                          '${Formatters.price(deal.discountedPrice)}원',
                                          style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.primary)),
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
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// [Antigravity | 2026-08-21] 수정범위: _showRadiusPicker — 사용자가 원하는 탐색 반경(1km, 3km, 5km, 10km)을 즉시 변경하고 구글맵 카메라를 오렌지 반경 원 크기에 맞게 자동 줌
void _showRadiusPicker(
  BuildContext context,
  LocationProvider loc,
  GoogleMapController? mapController,
  LatLng center,
  double Function(int) zoomForRadius,
) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Theme.of(context).scaffoldBackgroundColor,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
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
            const SizedBox(height: 18),
            const Text(
              '동네 탐색 반경 설정',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              '내 위치 기준으로 선택한 반경 내의 딜만 지도와 홈에 표시됩니다',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
            const SizedBox(height: 20),
            Row(
              children: [1, 3, 5, 10].map((r) {
                final isSel = loc.radiusKm == r;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isSel ? AppColors.primary : Colors.grey.withValues(alpha: 0.1),
                          foregroundColor: isSel ? Colors.white : Theme.of(context).textTheme.bodyMedium?.color,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(
                              color: isSel ? AppColors.primary : Colors.grey.withValues(alpha: 0.2),
                            ),
                          ),
                        ),
                        onPressed: () {
                          AppHaptics.selection();
                          loc.setRadiusKm(r);
                          mapController?.animateCamera(
                            CameraUpdate.newLatLngZoom(center, zoomForRadius(r)),
                          );
                          Navigator.pop(ctx);
                        },
                        child: Text(
                          '${r}km',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    ),
  );
}
