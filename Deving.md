  # 우리 동네 타임딜 — 개발 현황

  > 2026-08-20~22 교내 해커톤 대비 개발 현황판  
  > 마지막 업데이트: 2026-08-01

  ---

  ## 기술 스택

  | 영역 | 기술 |
  |------|------|
  | 프레임워크 | Flutter 3.44.8 (stable) |
  | 언어 | Dart 3.11.4 |
  | 상태관리 | Provider 6.1.2 |
  | 로컬 저장 | shared_preferences 2.3.0 |
  | 지도 | flutter_map 7.0.2 + latlong2 0.9.1 (OpenStreetMap) |
  | 공유 | share_plus 10.1.0 |
  | 라우팅 | Navigator (go_router 설치만, 미사용) |
  | 아이콘 | lucide_icons 0.257.0 (pub cache 패치 적용) |
  | 이미지 | cached_network_image + Unsplash CDN |
  | 폰트 | Google Fonts — Pacifico (스플래시) |
  | 테마 | Material 3, 다크/라이트 모드 |
  | 백엔드 | **현재 없음 — mock_data.dart 기반 / 다음 단계: Supabase** |

  ---

  ## Provider 아키텍처

  ```
  main.dart
  └── MultiProvider
      ├── ThemeProvider       — 다크/라이트 모드 + SharedPreferences 영속화
      ├── DealProvider        — 딜 목록 (mockDeals 초기값 + 사장님 등록 딜)
      ├── LocationProvider    — 동네 설정 + SharedPreferences 영속화
      ├── ReservationProvider — 예약 목록 (mock 3건 초기값)
      └── WishlistProvider    — 찜한 딜 ID Set
  ```

  ---

  ## 화면 구현 현황

  ### 공통 / 진입 플로우

  | 화면 | 파일 | UI | 기능 | 비고 |
  |------|------|----|------|------|
  | 스플래시 | `splash/splash_screen.dart` | ✅ | ✅ | 로고 애니메이션, 온보딩 완료 여부 확인 후 분기 |
  | 온보딩 | `onboarding/onboarding_screen.dart` | ✅ | ✅ | 3페이지, 완료/건너뛰기 시 SharedPreferences 저장 |
  | 로그인 | `auth/login_screen.dart` | ✅ | 🚧 | 4개 버튼 UI → RoleSelectScreen 통과, 실제 OAuth 없음 |
  | 역할 선택 | `role_select/role_select_screen.dart` | ✅ | ✅ | 소비자 → MainScaffold, 사장님 → MerchantHomeScreen |

  ### 소비자 (Consumer) 플로우

  | 화면 | 파일 | UI | 기능 | 비고 |
  |------|------|----|------|------|
  | 홈 (딜 목록) | `home/home_screen.dart` | ✅ | ✅ | DealProvider + LocationProvider, 카테고리 필터, 동네 배너 탭→설정 |
  | 딜 카드 | `home/widgets/deal_card.dart` | ✅ | ✅ | 하트→WishlistProvider, 재고 게이지, 카운트다운 |
  | 딜 상세 | `deal_detail/deal_detail_screen.dart` | ✅ | ✅ | 예약→ReservationProvider, 하트→WishlistProvider, 공유, 가게 보기, 상태바 자동조절 |
  | 검색 | `search/search_screen.dart` | ✅ | ✅ | DealProvider 연결, 사장님 등록 딜도 검색, 텍스트 필터 |
  | 지도 | `map/map_screen.dart` | ✅ | ✅ | flutter_map + OSM, 딜 마커, 탭→미리보기 카드→상세, 다크/라이트 타일 |
  | 알림 | `notifications/notifications_screen.dart` | ✅ | ✅ | ReservationProvider 이벤트 실시간, 읽지않음 뱃지 |
  | 내 정보 | `my_page/my_page_screen.dart` | ✅ | ✅ | 예약수/찜수/절약금액 Provider 실시간, 메뉴 네비 연결 |
  | 예약 내역 | `my_page/reservation_screen.dart` | ✅ | ✅ | ReservationProvider 실시간, 취소/픽업완료 버튼 |
  | 찜 목록 | `my_page/wishlist_screen.dart` | ✅ | ✅ | WishlistProvider 실시간 반영 |
  | 동네 설정 | `my_page/location_settings_screen.dart` | ✅ | ✅ | LocationProvider 연결, 저장→홈 즉시 반영 + SharedPreferences |
  | 가게 보기 | `store/store_screen.dart` | ✅ | ✅ | 딜 상세→StoreScreen, 가게 배너 + 진행중 딜 목록 |

  ### 사장님 (Merchant) 플로우

  | 화면 | 파일 | UI | 기능 | 비고 |
  |------|------|----|------|------|
  | 사장님 대시보드 | `merchant/merchant_home_screen.dart` | ✅ | ✅ | ReservationProvider + DealProvider 실시간 통계, 최근 주문 목록 |
  | 주문 관리 | `merchant/merchant_orders_screen.dart` | ✅ | 🚧 | 로컬 상태 토글, ReservationProvider 미연동 |
  | 딜 등록 | `merchant/deal_create_screen.dart` | ✅ | ✅ | 폼 → DealProvider.addDeal() → 홈 즉시 반영, 유효성 검사 |

  ### 공용 위젯

  | 위젯 | 파일 | 상태 | 비고 |
  |------|------|------|------|
  | 하단 네비게이션 | `widgets/bottom_nav_bar.dart` | ✅ | 4탭 연결 완료 |
  | 카운트다운 타이머 | `widgets/countdown_timer.dart` | ✅ | 실시간 초 단위 갱신 |
  | 재고 게이지 | `widgets/stock_gauge.dart` | ✅ | 남은 수량 비율 시각화 |

  ---

  ## 기능 구현 현황

  ### 완료 ✅

  - 스플래시 → 온보딩 → 로그인 → 역할 선택 → 홈 전체 플로우
  - 온보딩 완료 여부 저장 (재진입 시 스킵)
  - 다크/라이트 모드 전환 + SharedPreferences 영속화
  - 카테고리 필터링 + 실시간 카운트다운 타이머
  - 딜 상세 → 예약 확정 → 예약 내역 즉시 반영
  - 딜 카드/상세 하트 → 찜 목록 즉시 반영
  - 사장님 딜 등록 → 소비자 홈/검색 즉시 반영
  - 동네 설정 → 홈 배너 즉시 반영 + 영속화
  - 예약 취소 / 픽업완료 상태 전환
  - 사장님 대시보드 실시간 통계 (진행중 예약, 픽업완료, 누적 매출)
  - 지도 화면 (flutter_map + OpenStreetMap, 딜 마커, 탭→상세)
  - 알림 화면 (ReservationProvider 이벤트 기반)
  - 내 정보 활동 요약 실시간 (예약수/찜수/절약금액)
  - 딜 공유 (share_plus 네이티브 시트)
  - 가게 보기 화면 (딜 상세 → StoreScreen)
  - 딜 상세 상태바 자동 조절 + 이미지 gradient 오버레이

  ### 부분 구현 🚧

  | 항목 | 현황 | 이유 |
  |------|------|------|
  | 로그인 | UI→홈 통과, 실제 OAuth 없음 | Supabase Auth 연동 예정 |
  | 사장님 주문 관리 | 로컬 상태 토글만 | ReservationProvider 연동 필요 |
  | 예약 시 재고 감소 | Deal.remainingStock 미연동 | DB 연동 시 자연히 해결 |
  | 딜 등록 이미지 | 기본 이미지 고정 | image_picker + Supabase Storage 예정 |
  | 검색 히스토리 | 하드코딩 최근 검색어 | Supabase 연동 시 개선 |

  ### 의도적 미구현 (해커톤 데모 불필요)

  - 실시간 GPS 위치
  - FCM 푸시 알림
  - 프로필 편집
  - 리뷰/별점

  ---

  ## 데이터 모델 현황

  ```
  Deal ✅  (lib/core/models/deal.dart)
  ├── id, storeId, storeName, storeCategory
  ├── title, description
  ├── originalPrice, discountedPrice → discountPercent (computed)
  ├── totalStock, remainingStock → stockRatio, isUrgent (computed)
  ├── expiresAt (DateTime) → remaining (computed)
  ├── distanceKm, icon (IconData), imageUrl

  Reservation ✅  (lib/core/models/reservation.dart)
  ├── id, deal (Deal), reservedAt (DateTime)
  ├── status ('진행중' | '픽업완료' | '취소')
  ├── formattedPrice, formattedDate (computed)

  미정의 (Supabase 연동 시 추가)
  ├── User / Profile
  ├── Store
  └── Review
  ```

  ---

  ## 다음 단계 — Supabase 연동 계획

  ### 목표: 실제 서비스처럼 두 기기에서 데이터 동기화

  | 단계 | 작업 | 예상 시간 |
  |------|------|---------|
  | 1 | Supabase 프로젝트 생성 + 테이블 SQL 실행 | 30분 |
  | 2 | `supabase_flutter` 패키지 추가 + 초기화 | 30분 |
  | 3 | Auth 연결 (Google OAuth or 이메일) | 1시간 |
  | 4 | DealProvider → Supabase `deals` 테이블 | 1시간 |
  | 5 | ReservationProvider → Supabase `reservations` + Realtime | 1.5시간 |
  | 6 | WishlistProvider → Supabase `wishlists` 테이블 | 1시간 |
  | 7 | 딜 등록 이미지 → Supabase Storage | 1시간 |

  **예상 총 시간:** 6~7시간

  ### Supabase 테이블 스키마

  ```sql
  -- 딜
  create table deals (
    id uuid default gen_random_uuid() primary key,
    store_id text, store_name text, store_category text,
    title text, description text,
    original_price int, discounted_price int,
    total_stock int, remaining_stock int,
    expires_at timestamptz, distance_km float,
    image_url text, created_at timestamptz default now()
  );

  -- 예약
  create table reservations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    deal_id uuid references deals,
    status text default '진행중',
    reserved_at timestamptz default now()
  );

  -- 찜
  create table wishlists (
    user_id uuid references auth.users,
    deal_id uuid references deals,
    primary key (user_id, deal_id)
  );

  -- 프로필
  create table profiles (
    id uuid references auth.users primary key,
    name text, neighborhood text,
    role text default 'consumer'
  );
  ```

  ---

  ## 알려진 이슈 / 기술 부채

  | 항목 | 내용 |
  |------|------|
  | lucide_icons pub cache 패치 | `const LucideIconData` → `LucideIconData`, `static const` → `static final` 수동 패치. `pub upgrade` 시 재패치 필요 |
  | withOpacity deprecated | `withOpacity()` → `withValues(alpha:)` 마이그레이션 필요 (info 레벨, 빌드 정상) |
  | 예약 시 재고 미감소 | Deal.remainingStock이 예약해도 안 줄어듦. Supabase 연동 시 트리거로 해결 |
  | 사장님 딜 imageUrl | 신규 등록 딜 기본 이미지 고정 (Supabase Storage 연동 예정) |
  | 지도 좌표 하드코딩 | mock deals 5개만 고정 좌표, 신규 딜은 랜덤 오프셋 |
  | MockData 만료 시간 | `DateTime.now().add(...)` 기준, 앱 재시작 시 리셋됨 |
