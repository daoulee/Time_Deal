import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class StatusColors {
  static Color foreground(String status) => switch (status) {
    '픽업완료' => Colors.green,
    '취소' => Colors.red,
    _ => AppColors.primary,
  };

  static Color background(String status) => switch (status) {
    '픽업완료' => Colors.green.withValues(alpha: 0.1),
    '취소' => Colors.red.withValues(alpha: 0.1),
    _ => AppColors.primary.withValues(alpha: 0.1),
  };
}
