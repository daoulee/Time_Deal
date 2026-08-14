import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/models/deal.dart';
import '../../core/providers/reservation_provider.dart';
import '../../core/providers/wishlist_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/countdown_timer.dart';
import '../../widgets/stock_gauge.dart';
import '../my_page/reservation_screen.dart';
import '../store/store_screen.dart';

class DealDetailScreen extends StatefulWidget {
  final Deal deal;
  const DealDetailScreen({super.key, required this.deal});

  @override
  State<DealDetailScreen> createState() => _DealDetailScreenState();
}

class _DealDetailScreenState extends State<DealDetailScreen> {
  static const _expandedHeight = 220.0;

  final _scrollController = ScrollController();
  Animation<double>? _routeAnimation;
  bool _collapsed = false;
  bool _routeVisible = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final animation = ModalRoute.of(context)?.animation;
    if (animation != _routeAnimation) {
      _routeAnimation?.removeListener(_onRouteAnimate);
      _routeAnimation = animation;
      _routeAnimation?.addListener(_onRouteAnimate);
      _onRouteAnimate();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _routeAnimation?.removeListener(_onRouteAnimate);
    super.dispose();
  }

  void _onScroll() {
    if (!mounted) return;
    final collapsed = _scrollController.offset >= (_expandedHeight - kToolbarHeight);
    if (collapsed != _collapsed) setState(() => _collapsed = collapsed);
  }

  void _onRouteAnimate() {
    if (!mounted) return;
    final visible = (_routeAnimation?.value ?? 1.0) > 0.5;
    if (visible != _routeVisible) setState(() => _routeVisible = visible);
  }

  SystemUiOverlayStyle get _statusBarStyle {
    if (!_routeVisible) return SystemUiOverlayStyle.dark;
    if (_collapsed) {
      return Theme.of(context).brightness == Brightness.dark
          ? SystemUiOverlayStyle.light
          : SystemUiOverlayStyle.dark;
    }
    // 확장 상태: gradient가 이미지 상단을 어둡게 만들어주므로 항상 light (흰 아이콘)
    return SystemUiOverlayStyle.light;
  }

  String _fmt(int price) => price
      .toString()
      .replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');

  @override
  Widget build(BuildContext context) {
    final deal = widget.deal;
    final iconColor = _collapsed ? null : Colors.white;

    return Scaffold(
      body: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverAppBar(
            expandedHeight: _expandedHeight,
            pinned: true,
            systemOverlayStyle: _statusBarStyle,
            iconTheme: IconThemeData(color: iconColor),
            actionsIconTheme: IconThemeData(color: iconColor),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // 실제 이미지
                  CachedNetworkImage(
                    imageUrl: deal.imageUrl,
                    fit: BoxFit.cover,
                    placeholder: (_, _) => Container(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      child: Center(child: Icon(deal.icon, size: 80, color: AppColors.primary)),
                    ),
                    errorWidget: (_, _, _) => Container(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      child: Center(child: Icon(deal.icon, size: 80, color: AppColors.primary)),
                    ),
                  ),
                  // 상단 gradient: 상태바/아이콘 가시성 보장
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        stops: [0.0, 0.5],
                        colors: [
                          Color(0x88000000), // 54% 검정
                          Color(0x00000000), // 투명
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              Consumer<WishlistProvider>(
                builder: (context, wl, _) {
                  final liked = wl.isLiked(deal.id);
                  return IconButton(
                    icon: Icon(
                      LucideIcons.heart,
                      color: liked ? AppColors.primary : iconColor,
                    ),
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      wl.toggle(deal);
                    },
                  );
                },
              ),
              IconButton(
                icon: Icon(LucideIcons.share2),
                onPressed: () {
                  final d = widget.deal;
                  Share.share(
                    '🔥 ${d.storeName} - ${d.title}\n'
                    '${d.discountPercent}% 할인 · ${_fmt(d.discountedPrice)}원\n'
                    '우리 동네 타임딜에서 확인하세요!',
                  );
                },
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('${deal.discountPercent}% 할인',
                            style: const TextStyle(color: Colors.white,
                                fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 8),
                      Text(deal.storeCategory,
                          style: TextStyle(fontSize: 13, color: Colors.grey[500])),
                      const Spacer(),
                      Icon(LucideIcons.mapPin, size: 14, color: Colors.grey),
                      Text(
                          ' ${deal.distanceKm < 1 ? '${(deal.distanceKm * 1000).round()}m' : '${deal.distanceKm.toStringAsFixed(1)}km'}',
                          style: TextStyle(fontSize: 13, color: Colors.grey[500])),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(deal.title,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(deal.storeName,
                      style: TextStyle(fontSize: 14, color: Colors.grey[500])),
                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${_fmt(deal.discountedPrice)}원',
                          style: const TextStyle(fontSize: 28,
                              fontWeight: FontWeight.w800, color: AppColors.primary)),
                      const SizedBox(width: 10),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('${_fmt(deal.originalPrice)}원',
                            style: TextStyle(
                              fontSize: 16, color: Colors.grey[400],
                              decoration: TextDecoration.lineThrough,
                            )),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('마감까지',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                        CountdownTimer(expiresAt: deal.expiresAt, fontSize: 20),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  StockGauge(remaining: deal.remainingStock, total: deal.totalStock),
                  const SizedBox(height: 24),
                  const Text('딜 소개', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(deal.description,
                      style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.6)),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Center(child: Icon(LucideIcons.store, size: 22, color: AppColors.primary)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(deal.storeName,
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              Text(deal.storeCategory,
                                  style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => StoreScreen(representativeDeal: deal),
                            ),
                          ),
                          child: const Text('가게 보기'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
          child: Consumer<ReservationProvider>(
            builder: (context, rp, _) {
              final alreadyReserved = rp.isReserved(deal.id);
              final soldOut = deal.remainingStock == 0;
              return ElevatedButton(
                onPressed: (soldOut || alreadyReserved)
                    ? null
                    : () {
                        HapticFeedback.mediumImpact();
                        _showReservationDialog(context);
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: alreadyReserved ? Colors.grey[300] : null,
                ),
                child: Text(
                  soldOut
                      ? '품절'
                      : alreadyReserved
                          ? '예약 완료 ✓'
                          : '지금 예약하기',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: alreadyReserved ? Colors.grey[600] : null,
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  void _showReservationDialog(BuildContext context) {
    final deal = widget.deal;
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            Text(deal.title,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('${_fmt(deal.discountedPrice)}원',
                style: const TextStyle(
                    fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.primary)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  final nav = Navigator.of(context);
                  final ok = await context.read<ReservationProvider>().reserve(deal);
                  if (!context.mounted) return;
                  nav.pop();
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(ok ? '예약 완료! 픽업 시간에 방문해 주세요' : '예약할 수 없어요 (품절 또는 이미 예약됨)'),
                      action: ok ? SnackBarAction(
                        label: '내역 보기',
                        textColor: Colors.white,
                        onPressed: () => nav.push(
                          MaterialPageRoute(
                              builder: (_) => const ReservationScreen()),
                        ),
                      ) : null,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                child: const Text('예약 확정',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
