# 프로젝트 보고서 — 우리 동네 타임딜 (Town Flash Deal)

> 최초 작성: 2026-07-17 / 최종 업데이트: 2026-08-08  
> 대회: 소프트웨어학부 해커톤 (2026.08.20 ~ 08.22)  
> 팀명: 연리 (連理) | 팀장: 최다울 (202230136)

---

## 1. 프로젝트 개요

**우리 동네 타임딜**은 동네 소상공인이 재고 소진 / 마감 임박 상품을 실시간 플래시 세일로 인근 주민에게 판매하는 **하이퍼로컬 한정판매 플랫폼**이다.

| 항목 | 내용 |
|------|------|
| 장르 | 로컬 커머스 / 플래시 세일 앱 |
| 타깃 사용자 | 동네 주민 (소비자) + 동네 소상공인 (판매자) |
| 핵심 가치 | 긴박감(urgency) 기반 UX로 즉각적 구매 결정 유도 |
| 플랫폼 | Flutter 3.x (iOS / Android 크로스플랫폼) |
| 백엔드 | Supabase (PostgreSQL + Realtime + Storage) |

---

## 2. 문제 정의

- 동네 가게들은 당일 재고 소진 실패 시 폐기 손실 발생
- 주민은 근처 핫딜 정보를 실시간으로 알기 어려움
- 기존 배달앱/중고거래 앱은 "지금 이 순간, 이 동네" 한정 플래시 세일에 특화되어 있지 않음

---

## 3. 기능 구현 현황

### 소비자 측

| 기능 | 상태 | 비고 |
|------|------|------|
| 타임딜 피드 | ✅ | 카테고리 필터, Supabase Realtime 실시간 동기화 |
| 카운트다운 타이머 | ✅ | 초 단위 실시간 갱신 (CountdownTimer 위젯) |
| 재고 게이지 바 | ✅ | 잔여 재고 비율 색상 전환 (StockGauge 위젯) |
| 딜 예약 | ✅ | 예약 확정 → DB 저장 + 재고 감소 + Realtime 반영 |
| 찜하기 | ✅ | 딜 카드/상세 하트 → wishlists 테이블 동기화 |
| 지도 | ✅ | Google Maps + 할인율% 원형 커스텀 마커, 탭 → 슬라이드업 딜 카드 |
| GPS 거리 정렬 | ✅ | geolocator 실위치 → Haversine 거리 계산 → 거리 오름차순 자동 정렬 |
| 만료 딜 처리 | ✅ | 홈 피드 자동 필터링, 흑백+마감 배지, expires_at Supabase 쿼리 필터 |
| 검색 | ✅ | 가게명/딜명 실시간 텍스트 필터 |
| 알림 | ✅ | 예약 이벤트 기반 알림 + 미읽음 뱃지 |
| 가게 보기 | ✅ | 딜 상세 → 가게 정보 + 진행중 딜 목록 |
| 딜 공유 | ✅ | 네이티브 공유 시트 (share_plus) |
| 동네 설정 | ✅ | 선택 즉시 홈 반영, SharedPreferences 영속화 |
| 다크모드 | ✅ | SharedPreferences 영속화 |
| 예약 내역 | ✅ | 진행중/픽업완료/취소 탭 분리 + 예약 취소/픽업완료 처리 |
| 찜 목록 | ✅ | WishlistProvider 기반, 실시간 |
| 내 정보 | ✅ | 예약수/찜수/절약금액 실시간 요약 |

### 사장님 측

| 기능 | 상태 | 비고 |
|------|------|------|
| 대시보드 통계 | ✅ | 진행중 예약 / 픽업완료 / 누적매출 실시간 |
| 딜 등록 | ✅ | 카테고리 선택 + 가게이름 입력 + 사진 업로드 + 가격 콤마 포매팅 + 등록 후 대시보드 자동 이동 |
| 딜 관리 (주문관리) | ✅ | 전체/진행중/픽업완료 탭, 픽업확인/취소 액션, Realtime |

---

## 4. 기술 스택

### 앱

| 레이어 | 기술 |
|--------|------|
| 앱 프레임워크 | Flutter 3.x (Dart 3.11.4) |
| 상태관리 | Provider 6.x + ChangeNotifier |
| UI | Material 3 + 커스텀 테마 (AppColors, AppTheme) |
| 지도 | google_maps_flutter + Google Maps API |
| 커스텀 마커 | dart:ui Canvas + BitmapDescriptor (할인율% 원형) |
| 위치 | geolocator + Haversine 거리 계산 |
| 로컬 저장 | SharedPreferences (테마, 온보딩, 동네) |
| 이미지 캐싱 | cached_network_image |
| 이미지 선택 | image_picker 1.1.2 |
| 공유 | share_plus 10.1.0 |
| 아이콘 | lucide_icons |

### 백엔드

| 항목 | 내용 |
|------|------|
| 플랫폼 | Supabase (PostgreSQL + Realtime WebSocket) |
| 인증 | DeviceId (shared_preferences 기반 UUID, 기기 식별) |
| 딜 테이블 | `deals` — CRUD, Realtime 구독 |
| 예약 테이블 | `reservations` — user_id, deal_id, status, Realtime |
| 찜 테이블 | `wishlists` — user_id, deal_id |
| 이미지 저장 | Supabase Storage `deal-images` 버킷 (실패 시 Unsplash fallback) |

---

## 5. 아키텍처

### Provider 구조

```
MultiProvider (main.dart)
├── ThemeProvider       — 다크/라이트 + SharedPreferences
├── DealProvider        — Supabase deals 테이블, Realtime 구독, mock fallback
├── LocationProvider    — 동네명 + SharedPreferences
├── ReservationProvider — consumer용 (DeviceId 필터) + merchant용 (전체) 분리
└── WishlistProvider    — 찜 ID Set, Supabase wishlists
```

### 실시간 동기화 흐름

```
소비자 예약 확정
  → reservations INSERT (Supabase)
  → deals UPDATE remaining_stock--
  → Realtime 이벤트
  → ReservationProvider._load() 재호출
  → 사장님 대시보드 / 딜 관리 즉시 갱신
```

### 딜 등록 이미지 처리

```
사진 선택 (image_picker)
  → Supabase Storage deals/{dealId}.jpg 업로드
  → 성공: Storage Public URL 사용
  → 실패: 카테고리별 Unsplash 기본 이미지 fallback
```

---

## 6. 데이터 모델

```dart
class Deal {
  String id, storeId, storeName, storeCategory;
  String title, description;
  int originalPrice, discountedPrice;  // discountPercent (computed)
  int totalStock, remainingStock;      // stockRatio, isUrgent (computed)
  DateTime expiresAt;                  // remaining (computed)
  double distanceKm;
  String iconName, imageUrl;
}

class Reservation {
  String id, userId;
  Deal deal;
  DateTime reservedAt;
  String status; // '진행중' | '픽업완료' | '취소'
}
```

---

## 7. 폴더 구조

```
app/lib/
├── main.dart                     # Supabase 초기화, DeviceId, MultiProvider
├── core/
│   ├── data/mock_data.dart       # Supabase 연결 실패 시 fallback 딜 5건
│   ├── models/deal.dart          # fromJson / toJson 완비
│   ├── models/reservation.dart   # userId 포함
│   ├── providers/
│   │   ├── deal_provider.dart    # Realtime + createFromForm
│   │   ├── reservation_provider.dart  # consumer + merchant 분리 쿼리
│   │   ├── wishlist_provider.dart
│   │   ├── location_provider.dart
│   │   └── theme_provider.dart
│   ├── services/device_id.dart   # 기기 UUID 생성 및 영속화
│   └── theme/app_colors.dart, app_theme.dart
├── screens/
│   ├── splash/                   # 로고 + 초기화 대기
│   ├── onboarding/               # 동네 입력 온보딩 (최초 1회)
│   ├── role_select/              # 소비자 / 사장님 역할 선택
│   ├── home/                     # 피드 + DealCard (urgency 강조)
│   ├── deal_detail/              # SliverAppBar, 예약, 찜, 공유, 가게보기
│   ├── search/
│   ├── map/                      # flutter_map + 딜 마커
│   ├── notifications/
│   ├── store/
│   ├── my_page/                  # 예약내역, 찜목록, 동네설정, 내정보
│   └── merchant/
│       ├── merchant_home_screen.dart   # 대시보드
│       ├── deal_create_screen.dart     # 카테고리 + 이미지 + 가격(콤마) + 마감
│       └── merchant_orders_screen.dart # 딜 관리 (전체/진행중/픽업완료)
└── widgets/
    ├── bottom_nav_bar.dart
    ├── countdown_timer.dart
    └── stock_gauge.dart
```

---

## 8. 빌드 및 정적 분석 결과 (2026-08-08 기준)

```
flutter analyze --no-fatal-infos
→ No issues found!
  - withOpacity → withValues(alpha:) 전체 교체 완료
  - unnecessary_underscores 전체 수정 완료
  - google_maps_flutter zIndex → zIndexInt 교체 완료
  - google_maps_flutter setMapStyle → GoogleMap.style 교체 완료
  - 에러(error) 0건 / 경고(warning) 0건 / info 0건

flutter build ios --simulator --no-pub
→ Xcode build done (11.8s)
→ ✓ Built build/ios/iphonesimulator/Runner.app

배포 대상
→ iPhone 17 (08B18C30-B11A-4387-9F9E-C888D21C0FCD) ✅
→ iPhone 17 Pro (947B20D2-77D7-4400-AEEC-8EA5493033CF) ✅
```

---

## 9. 보안 현황 (2026-08-08 업데이트)

| 취약점 | 수정 전 | 수정 후 | 상태 |
|--------|---------|---------|------|
| 상인 예약 데이터 유출 | 전체 reservations 조회 | `deals.store_id = DeviceId` 필터 조인 | ✅ 해결 |
| 재고 레이스 컨디션 | 클라이언트 read-modify-write | Supabase RPC `decrement_stock` atomic UPDATE | ✅ 해결 (RPC 등록 필요) |
| 이중 예약 / 재고 0 예약 | UI 체크만 | `reserve()` 진입 시 서버 사전 검증 + 실패 롤백 | ✅ 해결 |
| RLS 정책 | 없음 | `supabase_setup.sql` 작성 완료 | ⏳ Dashboard 실행 필요 |
| 소셜 인증 | DeviceId(UUID) 기기 식별 | DeviceId 유지 (해커톤 범위) | 낮음 |

**`supabase_setup.sql` 실행 방법**: Supabase Dashboard → SQL Editor → 파일 내용 붙여넣기 → Run

---

## 10. 알려진 제약 및 잔여 항목

| 항목 | 내용 | 영향도 |
|------|------|--------|
| Supabase RPC 미등록 | `decrement_stock` RPC 아직 실행 안 함 — fallback `.gt()` 동작 중 | 중간 — SQL Editor 실행 필요 |
| Push 알림 없음 | 앱 내 알림 탭으로 대체 | 낮음 |
| E2E 실기기 테스트 | Phase 3-C 리허설 전 두 기기 동시 E2E 테스트 필요 | 중간 — 데모 전 반드시 수행 |
| 카카오 공식 CI 아이콘 | 현재 직접 제작한 말풍선 SVG 사용 | 낮음 — 해커톤 데모에서 인식 가능 |
| 2-C 데모 스크립트 | 5분 데모 시나리오 미작성 | 높음 — 발표 전 필수 |

---

## 11. UX 핵심 원칙

1. **긴박감 (Urgency)** — 카운트다운 타이머 항상 노출, 30분 미만 시 isUrgent 카드 강조
2. **희소성 (Scarcity)** — 재고 게이지 빨간색 전환, 잔여 수량 표시
3. **즉각성 (Speed)** — 탭 → 예약 확정까지 2단계 / 낙관적 업데이트로 딜레이 없음
4. **양방향성 (Loop)** — 소비자 예약 → 사장님 대시보드 Realtime 즉시 반영

---

## 12. 심사 어필 포인트

- **소상공인 실생활 문제 해결** — 재고 손실 + 주민 정보 비대칭 동시 해결
- **Supabase Realtime 양방향 동기화** — 두 기기에서 딜/예약/찜이 실시간 연동
- **완성도 있는 양면 플로우** — 소비자(피드→예약) + 사장님(딜등록→주문관리) 전 과정 데모 가능
- **긴박감 UX** — 카운트다운 + 재고 게이지 + isUrgent 강조
- **이미지 업로드** — 갤러리 사진 선택 → Supabase Storage 저장 → 피드 즉시 반영
