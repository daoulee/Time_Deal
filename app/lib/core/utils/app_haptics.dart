import 'package:flutter/services.dart';

class AppHaptics {
  static void light() => HapticFeedback.lightImpact();
  static void selection() => HapticFeedback.selectionClick();

  static Future<void> success() async {
    HapticFeedback.mediumImpact();
    await Future.delayed(const Duration(milliseconds: 90));
    HapticFeedback.mediumImpact();
  }
}

// [Claude | 2026-08-21] 수정범위: AppHaptics.success() 신규 — 주문/딜 등록 완료 시 더블 햅틱
