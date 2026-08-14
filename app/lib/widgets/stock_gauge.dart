import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';

class StockGauge extends StatelessWidget {
  final int remaining;
  final int total;
  final bool showLabel;

  const StockGauge({
    super.key,
    required this.remaining,
    required this.total,
    this.showLabel = true,
  });

  Color get _barColor {
    if (remaining == 0) return AppColors.textSecondary;
    final ratio = remaining / total;
    if (ratio <= 0.2) return AppColors.primary;
    if (ratio <= 0.5) return Colors.orange;
    return Colors.green;
  }

  @override
  Widget build(BuildContext context) {
    // UX: 품절 상태를 명시적 텍스트로 표시 — 게이지 비어있는 것만으로는 "로딩중"과 구분 불가 (피드백)
    if (remaining == 0) {
      return Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: AppColors.textSecondary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text(
              '품절',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary),
            ),
          ),
        ],
      );
    }

    final ratio = (remaining / total).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showLabel)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // UX: 보조 텍스트 통일 컬러 적용
                const Text('남은 수량',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                Text('$remaining / $total개',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _barColor,
                    )),
              ],
            ),
          ),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: ratio,
            minHeight: 6,
            backgroundColor: Colors.grey.withValues(alpha: 0.15),
            valueColor: AlwaysStoppedAnimation(_barColor),
          ),
        ),
      ],
    );
  }
}
