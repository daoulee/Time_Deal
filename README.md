# 우리 동네 타임딜

> 동네 소상공인의 마감 임박 재고를 실시간 플래시 세일로 연결하는 하이퍼로컬 커머스 앱  
> 2026 교내 해커톤 (2026.08.20~22) 출품작 — 팀 **연리 (連理)**

---

## 소개

**우리 동네 타임딜**은 두 가지 문제를 동시에 해결합니다.

- **소상공인**: 당일 팔지 못한 재고를 마감 특가로 빠르게 소진
- **소비자**: 걸어갈 수 있는 거리의 동네 가게에서 실시간 할인 딜을 발견

카운트다운 타이머와 재고 게이지가 만드는 **긴박감 UX**로 즉각적인 구매 결정을 유도합니다.

---

## 팀

| 역할 | 이름 | 학번 |
|------|------|------|
| 팀장 | 최다울 | 202230136 |
| 팀원 | 엄태훈 | 202230119 |
| 팀원 | 이동교 | 202230134 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 앱 | Flutter 3.44.8 / Dart 3.11.4 |
| 상태관리 | Provider 6.x + ChangeNotifier |
| UI | Material 3 + 커스텀 테마 (AppColors, AppTheme) |
| 지도 | google_maps_flutter + Google Maps API |
| 커스텀 마커 | dart:ui Canvas + BitmapDescriptor |
| 위치 | geolocator + Haversine 거리 계산 |
| 로컬 저장 | SharedPreferences |
| 이미지 캐싱 | cached_network_image |
| 이미지 업로드 | image_picker 1.1.2 |
| 공유 | share_plus 10.1.0 |
| 백엔드 | Supabase (PostgreSQL + Realtime WebSocket + Storage) |
| 발표 사이트 | React + Vite |

---

## 주요 기능

### 소비자
- 홈 피드 — 카테고리 필터, Supabase Realtime 실시간 동기화, GPS 거리순 정렬
- 지도 — Google Maps + 할인율% 원형 커스텀 마커, 탭→슬라이드업 딜 카드
- 딜 예약 — 예약 확정 → 예약 내역 즉시 반영 + "내역 보기" 바로가기
- 찜하기 — 관심 딜 저장, 찜 목록 관리
- 검색 — 가게명·딜 이름 텍스트 검색
- 알림 — 예약/픽업 이벤트 알림
- 가게 보기 — 가게 정보 + 진행중 딜 목록
- 딜 공유 — 네이티브 공유 시트
- 만료 딜 — 자동 흑백 처리 + 마감 배지, 홈 피드 자동 제외
- 다크/라이트 모드, 동네 설정 (SharedPreferences 영속화)

### 사장님
- 대시보드 — 진행중 예약·픽업완료·누적 매출 실시간 갱신
- 딜 등록 — 가게이름 + 카테고리 + 사진 업로드 + 가격/수량/마감시간 → 소비자 홈 즉시 반영
- 주문 관리 — 예약 현황 탭 분리(전체/진행중/픽업완료), 픽업확인/취소 액션

---

## 빌드 상태

```
flutter analyze --no-fatal-infos  →  No issues found!
flutter build ios --simulator     →  ✓ Built (Xcode build done)

배포 대상
  iPhone 17      (08B18C30-B11A-4387-9F9E-C888D21C0FCD) ✅
  iPhone 17 Pro  (947B20D2-77D7-4400-AEEC-8EA5493033CF) ✅
```

---

## Supabase 초기 설정

Supabase Dashboard → **SQL Editor** → `supabase_setup.sql` 내용 붙여넣기 → **Run**

```
필수 항목:
  1. decrement_stock RPC  — 재고 레이스 컨디션 방지 atomic UPDATE
  2. RLS 정책             — deals / reservations 테이블 최소 보안
```

---

## 프로젝트 구조

```
town_flash_deal/
├── app/                    # Flutter 앱
│   ├── lib/
│   │   ├── core/
│   │   │   ├── data/       # mock_data.dart (오프라인 fallback 5건)
│   │   │   ├── models/     # Deal, Reservation
│   │   │   ├── providers/  # DealProvider, ReservationProvider,
│   │   │   │               # WishlistProvider, LocationProvider, ThemeProvider
│   │   │   ├── services/   # DeviceId (기기 UUID)
│   │   │   └── theme/      # AppColors, AppTheme
│   │   ├── screens/
│   │   │   ├── auth/       # 로그인 (소셜 버튼 UI)
│   │   │   ├── deal_detail/
│   │   │   ├── home/
│   │   │   ├── map/
│   │   │   ├── merchant/   # 사장님 대시보드, 딜 등록, 주문 관리
│   │   │   ├── my_page/    # 예약내역, 찜목록, 동네설정, 내정보
│   │   │   ├── notifications/
│   │   │   ├── onboarding/
│   │   │   ├── search/
│   │   │   ├── splash/
│   │   │   └── store/      # 가게 보기
│   │   └── widgets/        # bottom_nav_bar, countdown_timer, stock_gauge
│   └── assets/
│       └── icons/          # kakao.svg, naver.svg, google.png
├── presentation/           # 발표 사이트 (React + Vite)
├── supabase_setup.sql      # RPC + RLS 초기화 스크립트
├── DemoScript.md           # 5분 데모 시나리오
├── Report.md               # 프로젝트 보고서
├── TroubleReport.md        # 이슈 해결 기록 (#001~#030)
└── TodoList.md             # 개발 진행 현황
```

---

## 실행 방법

### Flutter 앱
```bash
cd app
flutter pub get
flutter run
```

> 시뮬레이터 GPS: 앱이 실제 위치를 가져오고, 동네 중심에서 50km 초과 시 동네 중심 좌표로 자동 fallback

### 발표 사이트
```bash
cd presentation
npm install
npm run dev
# http://localhost:5173
```

---

## 개발 문서

| 파일 | 내용 |
|------|------|
| [`Report.md`](./Report.md) | 기능 구현 현황, 아키텍처, 데이터 모델, 보안 현황 |
| [`TodoList.md`](./TodoList.md) | Phase별 작업 체크리스트 |
| [`TroubleReport.md`](./TroubleReport.md) | 이슈 해결 기록 (#001~#029) |
| [`DemoScript.md`](./DemoScript.md) | 5분 데모 시나리오 |
| [`supabase_setup.sql`](./supabase_setup.sql) | DB RPC + RLS 초기화 |
