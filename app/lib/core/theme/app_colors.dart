import 'package:flutter/material.dart';

class AppColors {
  // UX: 핫핑크(#FF005F) → 오렌지레드(#FF4500)로 변경. 긴박감은 유지하되 눈 피로 감소
  static const primary = Color(0xFFFF4500);
  static const primaryDark = Color(0xFFCC3700);
  static const discountRed = Color(0xFFEF4444);

  // UX: 보조 텍스트 통일 컬러. 기존 Colors.grey[400~600] 혼재 → 단일값으로 일관성 확보
  static const textSecondary = Color(0xFF858585);

  // Light Mode
  static const lightBackground = Color(0xFFFFFFFF);
  static const lightSurface = Color(0xFFF5F5F5);
  static const lightCard = Color(0xFFFFFFFF);
  static const lightText = Color(0xFF0D0B0B);
  static const lightTextSecondary = textSecondary;
  static const lightBorder = Color(0xFFEEEEEE);

  // Dark Mode
  static const darkBackground = Color(0xFF0D0B0B);
  static const darkSurface = Color(0xFF1A1818);
  static const darkCard = Color(0xFF1F1D1D);
  static const darkText = Color(0xFFFFFFFF);
  static const darkTextSecondary = Color(0xFF9E9E9E);
  static const darkBorder = Color(0xFF2A2828);
}
