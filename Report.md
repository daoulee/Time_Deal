# 프로젝트 이해 보고서 — 우리 동네 타임딜 (Town Flash Deal)

> 작성일: 2026-07-17  
> 대회: 소프트웨어학부 해커톤 (2026.08.21 ~ 08.23)

---

## 1. 프로젝트 개요

**우리 동네 타임딜**은 동네 소상공인이 재고 소진 / 마감 임박 상품을 실시간 플래시 세일로 인근 주민에게 판매하는 **하이퍼로컬 한정판매 플랫폼**이다.

| 항목 | 내용 |
|------|------|
| 장르 | 로컬 커머스 / 플래시 세일 앱 |
| 타깃 사용자 | 동네 주민 (소비자) + 동네 소상공인 (판매자) |
| 핵심 가치 | 긴박감(urgency) 기반 UX로 즉각적 구매 결정 유도 |
| 플랫폼 | Flutter (iOS / Android / Web 크로스플랫폼) |

---

## 2. 문제 정의

- 동네 가게들은 당일 재고 소진 실패 시 폐기 손실 발생
- 주민은 근처 핫딜 정보를 실시간으로 알기 어려움
- 기존 배달앱/중고거래 앱은 "지금 이 순간, 이 동네" 한정 플래시 세일에 특화되어 있지 않음

---

## 3. 핵심 기능 (MVP Scope — 3일 기준)

### 소비자 측

| 기능 | 설명 |
|------|------|
| 타임딜 피드 | 현재 진행 중인 동네 한정딜 카드 목록 |
| 카운트다운 타이머 | 딜 종료까지 남은 시간 실시간 표시 (HH:MM:SS) |
| 재고 게이지 바 | 잔여 재고 / 초기 재고 시각화 (긴박감 조성) |
| 할인율 / 가격 표시 | 원가 취소선 + 할인율 + 최종가 강조 |
| 예약하기 CTA | 딜 만료 / 품절 시 버튼 상태 변경 |

### 공통 UI 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `TimeDealCard` | 단일 딜 정보 카드 (이미지, 타이머, 가격, 재고) |
| `CountdownTimer` | 종료 시각 기반 초 단위 카운트다운 위젯 |
| `StockGaugeBar` | 재고 잔여율에 따라 색상 변화하는 프로그레스 바 |
| `TimeDealGrid` | 카드들을 반응형 그리드로 배치하는 컨테이너 |

---

## 4. 데이터 모델

```dart
class TimeDeal {
  final String id;
  final String shopName;       // 예: "정왕동 식자재마트"
  final String location;       // 예: "정왕동"
  final String productTitle;
  final String imageUrl;
  final int originalPrice;
  final int salePrice;
  final int discountPercent;
  final DateTime expiresAt;    // 카운트다운 기준
  final int totalStock;
  final int remainingStock;
}
```

### Mock 데이터 예시 (4종)

| # | 상품 | 가게 | 할인율 |
|---|------|------|--------|
| 1 | 한우 1등급 채끝살 300g | 정왕동 식자재마트 | 40% |
| 2 | 유기농 딸기 500g | 능길동 과일가게 | 35% |
| 3 | 크루아상 + 소금빵 세트 | 시화 베이커리 | 30% |
| 4 | 신선 고등어 2마리 | 정왕 수산시장 | 50% |

---

## 5. UX 핵심 원칙

1. **긴박감 (Urgency)** — 카운트다운 타이머가 항상 눈에 띄어야 함
2. **희소성 (Scarcity)** — 재고 게이지가 빨간색으로 전환되며 "잔여 3개!" 문구 강조
3. **즉각성 (Speed)** — 탭 → 예약 완료까지 최소한의 단계
4. **신뢰성 (Trust)** — 가게 이름 + 위치 정보 항상 노출

---

## 6. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 앱 프레임워크 | Flutter (Dart, SDK ^3.11.4) |
| 상태관리 | (미정 — Riverpod 또는 Provider 권장) |
| UI 스타일 | Material 3 + 커스텀 테마 |
| 타이머 | `dart:async` `Timer.periodic` |
| 아이콘 | Material Icons (기본 내장) |
| 백엔드 연동 | (MVP: Mock 데이터 → 추후 Firebase / Supabase) |

---

## 7. 3일 개발 일정 (안)

| 날짜 | 목표 |
|------|------|
| Day 1 (08.21) | 프로젝트 세팅, 데이터 모델, Mock 데이터, TimeDealCard UI |
| Day 2 (08.22) | CountdownTimer 위젯, StockGaugeBar, 피드 그리드, 전체 연결 |
| Day 3 (08.23) | 버그 수정, 애니메이션 polish, 발표 자료 준비 |

---

## 8. 폴더 구조 (권장)

```
lib/
├── main.dart
├── models/
│   └── time_deal.dart
├── data/
│   └── mock_deals.dart
├── widgets/
│   ├── time_deal_card.dart
│   ├── countdown_timer.dart
│   ├── stock_gauge_bar.dart
│   └── time_deal_grid.dart
└── screens/
    └── home_screen.dart
```

---

## 9. 차별점 (심사 어필 포인트)

- 단순 쇼핑앱이 아닌 **실시간 긴박감 UX**에 집중한 설계
- 소상공인 재고 손실 문제라는 **실생활 문제 해결**
- 3일 MVP 기준 **완성도 높은 UI** 시연 가능
- 바이브코딩 활용으로 **빠른 프로토타이핑** 강점
