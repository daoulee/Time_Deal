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

  // 딜 좌표 해시 fallback용 고정 중심점
  static const _center = LatLng(37.5444, 127.0557);

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
    final c = dealCoordinates[deal.id];
    if (c != null) return LatLng(c.lat, c.lng);
    final hash = deal.id.hashCode;
    final latOffset = ((hash % 100) - 50) * 0.0002;
    final lngOffset = ((hash ~/ 100 % 100) - 50) * 0.0002;
    return LatLng(_center.latitude + latOffset, _center.longitude + lngOffset);
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

  String _fmt(int price) => price
      .toString()
      .replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');

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
                  Text('${_fmt(deal.discountedPrice)}원',
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

  @override
  Widget build(BuildContext context) {
    final deals = context.watch<DealProvider>().deals;
    final loc = context.watch<LocationProvider>();
    final mc = loc.mapCenter;
    final currentCenter = LatLng(mc.lat, mc.lng);

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
          CameraUpdate.newLatLngZoom(currentCenter, 15.0),
        );
      });
    }

    return Scaffold(
      body: Stack(
        children: [
          // 구글맵
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _initialCenter,
              zoom: 15.0,
            ),
            onMapCreated: _onMapCreated,
            style: Theme.of(context).brightness == Brightness.dark
                ? _darkMapStyle
                : null,
            markers: _buildMarkers(deals),
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: false,
            onTap: (_) => setState(() => _selectedDeal = null),
          ),

          // 상단 검색바
          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                      Text(loc.neighborhood,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
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

          // 선택된 딜 카드 — 슬라이드 업 애니메이션
          AnimatedPositioned(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            bottom: _selectedDeal != null ? 168 : -220,
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
            bottom: 160,
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
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(20)),
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
                  SizedBox(
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
                                          '${_fmt(deal.discountedPrice)}원',
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
