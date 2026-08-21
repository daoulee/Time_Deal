import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../core/theme/app_colors.dart';

class CountdownTimer extends StatefulWidget {
  final DateTime expiresAt;
  final double fontSize;
  final bool compact;

  const CountdownTimer({
    super.key,
    required this.expiresAt,
    this.fontSize = 13,
    this.compact = false,
  });

  @override
  State<CountdownTimer> createState() => _CountdownTimerState();
}

class _CountdownTimerState extends State<CountdownTimer> {
  late Timer _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    final initial = widget.expiresAt.difference(DateTime.now());
    _remaining = initial.isNegative ? Duration.zero : initial;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        final remaining = widget.expiresAt.difference(DateTime.now());
        setState(() => _remaining = remaining.isNegative ? Duration.zero : remaining);
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  // UX: 색상 의미론 수정 — 시간 여유에 따라 3단계로 자연스럽게 에스컬레이션
  // 충분(>1h) → 회색(안심) / 주의(30min~1h) → 오렌지(경고) / 긴박(<30min) → 오렌지레드(위험)
  Color get _color {
    if (_remaining.inHours >= 1) return AppColors.textSecondary;
    if (_remaining.inMinutes >= 30) return Colors.orange;
    return AppColors.primary;
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    if (_remaining.isNegative) {
      return Text('마감',
          style: TextStyle(color: AppColors.textSecondary, fontSize: widget.fontSize));
    }

    final h = _remaining.inHours;
    final m = _remaining.inMinutes.remainder(60);
    final s = _remaining.inSeconds.remainder(60);
    final timeText = h > 0
        ? '${_pad(h)}:${_pad(m)}:${_pad(s)}'
        : '${_pad(m)}:${_pad(s)}';

    if (widget.compact) {
      return Text(
        timeText,
        style: TextStyle(
          color: _color,
          fontSize: widget.fontSize,
          fontWeight: FontWeight.w700,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(LucideIcons.timer, size: widget.fontSize + 2, color: _color),
        const SizedBox(width: 4),
        Text(
          timeText,
          style: TextStyle(
            color: _color,
            fontSize: widget.fontSize,
            fontWeight: FontWeight.w700,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
