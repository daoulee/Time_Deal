import 'package:flutter/services.dart';

/// 성공/완료 순간에 쓰는 프리미엄 "따당" 더블 햅틱
class AppHaptics {
  static Future<void> success() async {
    HapticFeedback.mediumImpact();
    await Future.delayed(const Duration(milliseconds: 90));
    HapticFeedback.mediumImpact();
  }
}

// [Claude | 2026-08-21] 수정범위: AppHaptics.success() 신규 — 주문/딜 등록 완료 시 더블 햅틱
