import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/utils/app_haptics.dart';

// [Antigravity | 2026-08-23] 수정범위: SlidingSegmentedControl — 상단 위치 배너와 조화로운 주황빛 소프트 보더 및 배경 톤 통일
class SlidingSegmentedControl extends StatelessWidget {
  final List<String> segments;
  final int selectedIndex;
  final ValueChanged<int> onValueChanged;
  final double height;
  final EdgeInsetsGeometry margin;
  final Color? activeColor;
  final Color? backgroundColor;
  final Color? borderColor;
  final Color? inactiveTextColor;

  const SlidingSegmentedControl({
    super.key,
    required this.segments,
    required this.selectedIndex,
    required this.onValueChanged,
    this.height = 44,
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    this.activeColor,
    this.backgroundColor,
    this.borderColor,
    this.inactiveTextColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = backgroundColor ??
        (isDark
            ? const Color(0xFF1E1F25)
            : AppColors.primary.withValues(alpha: 0.05));
    final activeBg = activeColor ?? AppColors.primary;
    final border = borderColor ??
        (isDark
            ? AppColors.primary.withValues(alpha: 0.20)
            : AppColors.primary.withValues(alpha: 0.14));
    final inactiveText = inactiveTextColor ??
        (isDark ? Colors.white.withValues(alpha: 0.65) : const Color(0xFF555B68));

    return Container(
      height: height,
      margin: margin,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(height / 2),
        border: Border.all(
          color: border,
          width: 1,
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final slotWidth = constraints.maxWidth / segments.length;
          final capsuleWidth = slotWidth;

          return Stack(
            alignment: Alignment.centerLeft,
            children: [
              // 1. 단일 슬라이딩 액티브 캡슐 (잔상 없이 목표 세그먼트로 이동)
              AnimatedPositioned(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                left: selectedIndex * slotWidth,
                top: 0,
                bottom: 0,
                width: capsuleWidth,
                child: Container(
                  decoration: BoxDecoration(
                    color: activeBg,
                    borderRadius: BorderRadius.circular((height - 8) / 2),
                    boxShadow: [
                      BoxShadow(
                        color: activeBg.withValues(alpha: 0.32),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                ),
              ),
              // 2. 텍스트 레이블 레이어
              Row(
                children: List.generate(segments.length, (i) {
                  final label = segments[i];
                  final isSelected = i == selectedIndex;

                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        if (selectedIndex != i) {
                          AppHaptics.selection();
                          onValueChanged(i);
                        }
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Center(
                        child: AnimatedScale(
                          scale: isSelected ? 1.04 : 1.0,
                          duration: const Duration(milliseconds: 180),
                          curve: Curves.easeOutCubic,
                          child: TweenAnimationBuilder<Color?>(
                            tween: ColorTween(
                              end: isSelected
                                  ? Colors.white
                                  : inactiveText,
                            ),
                            duration: const Duration(milliseconds: 180),
                            builder: (_, color, _) {
                              return Text(
                                label,
                                style: TextStyle(
                                  color: color,
                                  fontSize: 13.5,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// TabController와 연동되는 시그니처 슬라이딩 탭바 (PreferredSizeWidget)
class SlidingPillTabBar extends StatefulWidget implements PreferredSizeWidget {
  final TabController controller;
  final List<String> tabs;
  final double height;
  final EdgeInsetsGeometry margin;

  const SlidingPillTabBar({
    super.key,
    required this.controller,
    required this.tabs,
    this.height = 44,
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
  });

  @override
  Size get preferredSize => Size.fromHeight(height + 16);

  @override
  State<SlidingPillTabBar> createState() => _SlidingPillTabBarState();
}

class _SlidingPillTabBarState extends State<SlidingPillTabBar> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTabChanged);
  }

  @override
  void didUpdateWidget(SlidingPillTabBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onTabChanged);
      widget.controller.addListener(_onTabChanged);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTabChanged);
    super.dispose();
  }

  void _onTabChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return SlidingSegmentedControl(
      segments: widget.tabs,
      selectedIndex: widget.controller.index,
      height: widget.height,
      margin: widget.margin,
      onValueChanged: (idx) {
        widget.controller.animateTo(idx);
      },
    );
  }
}
