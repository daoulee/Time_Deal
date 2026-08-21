# TodoList — 우리 동네 타임딜

> 마지막 업데이트: 2026-08-15 | D-5 (대회: 08.20~08.22) — Phase 1·2·3 전체 완료, 기능 결함 9종 수정, 알림 UI 완성, 거리 제한 적용, 실기기 설치 완료

---

## Phase 1 · 기술 완성 (D-14 ~ D-10 / 8/6 ~ 8/10)

### 1-A. GPS 실위치 연동
- [x] `geolocator` 패키지 pubspec.yaml 추가
- [x] `NSLocationWhenInUseUsageDescription` Info.plist 확인
- [x] `LocationProvider`에 GPS 현재 좌표 취득 로직 추가
- [x] 딜 카드 `distanceKm` — mock 고정값 → GPS 기반 Haversine 실거리 계산으로 교체
- [x] 홈 피드 딜 목록 거리 오름차순 자동 정렬
- [x] **시뮬레이터 GPS fallback** — 동네 중심에서 50km 초과 시 동네 중심 좌표로 대체 (TroubleReport #018)

### 1-B. 지도 개선
- [x] 커스텀 마커 구현 — 기본 핀 → 할인율(%) 텍스트 원형 마커 (BitmapDescriptor + Canvas)
- [x] 다크모드 지도 스타일 JSON 적용 (`GoogleMap.style`)
- [x] 지도 마커 탭 시 선택 딜 카드 애니메이션 개선 (슬라이드 업)

### 1-C. 딜 생명주기 처리
- [x] `expiresAt` 만료된 딜 홈 피드에서 자동 필터링
- [x] 만료 딜 카드에 "마감" 배지 + 흑백 처리
- [x] `DealProvider._load()`에서 만료 딜 제외 쿼리 (`expires_at > now()`)

### 1-D. 사장님 플로우 개선
- [x] 딜 등록 폼에 가게 이름 입력 필드 추가
- [x] 딜 등록 성공 후 사장님 대시보드로 자동 이동

### 1-E. 인프라
- [x] Supabase Storage `deal-images` Public 버킷 생성

---

## Phase 2 · UX & 발표 준비 (D-9 ~ D-5 / 8/11 ~ 8/15)

### 2-A. 앱 UX 마무리
- [x] 온보딩 화면 동네 선택 → 지도 초기 위치 자동 반영
- [x] 딜 상세 → 예약 완료 후 "예약 내역 보기" 바로가기 버튼 추가
- [x] 빈 상태(Empty State) UI 통일 — 홈/검색/알림/찜 목록
- [x] **스플래시 → 로그인 전환 개선** — fadeOut 완료 후 350ms FadeTransition (TroubleReport #019)
- [x] **my_page 섹션 구분선 개선** — `Divider` → 8px 회색 Container (iOS Settings 스타일)
- [x] **앱 아이콘 변경** — Flutter 기본 → Pacifico "Deal" 텍스트 오렌지 그라디언트 (1024×1024)
- [x] **앱 이름 현지화** — 영문 "Town Flash Deal" / 한국어 "타임딜" (lproj InfoPlist.strings)
- [x] **소셜 로그인 아이콘** — 카카오(말풍선 SVG), 네이버(N SVG), 구글(google-logo.png)

### 2-B. 발표 사이트 업데이트
- [x] Hero 섹션 — 앱 색상 #FF4500 반영
- [x] 기능 목록 섹션 — Google Maps, 이미지 업로드, GPS 거리 추가 (총 7개)
- [x] 기술 스택 섹션 — `google_maps_flutter`, `geolocator` 추가
- [x] 라이브 데모 섹션 — GIF 플레이스홀더 (`public/screens/realtime-sync.gif`)
- [x] 아키텍처 다이어그램 업데이트 (ArchSection)
- [x] MockUI → 실제 기기 스크린샷으로 교체 (PhoneScreenshot 컴포넌트)
- [ ] 스크린샷 촬영 후 `public/screens/` 에 파일 추가

### 2-C. 데모 시나리오 작성
- [x] 기기 역할 배정 — iPhone 17 (소비자) / iPhone 17 Pro (사장님)
- [x] 5분 데모 스크립트 작성 → `DemoScript.md` 작성 완료
  - Step 1: 사장님이 딜 등록 (사진 포함) — 약 1분
  - Step 2: 소비자 홈에 실시간 반영 확인 — 약 30초
  - Step 3: 소비자 예약 → 사장님 대시보드 즉시 반영 — 약 1분
  - Step 4: 지도에서 딜 위치 확인 — 약 30초
  - Step 5: 사장님 픽업 완료 처리 — 약 30초

---

## Phase 3 · 최종 마무리 (D-4 ~ D-1 / 8/16 ~ 8/19)

### 3-A. 안정화
- [x] 네트워크 오프라인 상태 예외처리 확인 (전 provider try-catch 확인)
- [x] 다크모드 전체 화면 점검
- [x] **보안 취약점 3종 수정** (2026-08-08)
  - [x] 상인 예약 데이터 유출 — `deals.store_id` 기반 필터로 본인 딜 예약만 조회 (TroubleReport #024)
  - [x] 재고 레이스 컨디션 — Supabase RPC `decrement_stock` atomic UPDATE (TroubleReport #025)
  - [x] 이중 예약 / 재고 0 예약 — `reserve()` 진입 시 사전 검증 + 실패 롤백 + bool 반환
- [x] `supabase_setup.sql` 작성 — `decrement_stock` RPC + RLS 정책 (실행 필요)
- [x] **내부 결함 검증 4종 수정** (2026-08-09)
  - [x] 사장님 대시보드 예약 getter 오류 — `byStatus`→`merchantByStatus`, `all`→`merchantAll` (#026)
  - [x] 상인 예약 쿼리 deal 필드 누락 — `.select('id,...')`→`.select('*,...')` (#027)
  - [x] `Deal.discountPercent` NaN throw — `originalPrice==0` 방어 조건 (#028)
  - [x] 지도 동네명 하드코딩 — `loc.neighborhood` 바인딩 (#029)
- [x] **기능 결함 9종 수정** (2026-08-13~14)
  - [x] BUG-1: 알림 팝업 `parentContext` 필드 삭제 → `Navigator.of(context)` 사전 캡처로 교체
  - [x] BUG-2: 예약 RPC 실패 시 fallback UPDATE `.gt('remaining_stock', 0).select()` → 빈 결과 throw
  - [x] BUG-3: `WishlistProvider` — 이미 찜한 딜 insert 시 upsert 충돌 방어
  - [x] BUG-4: `CountdownTimer` — remaining이 음수일 때 `Duration.zero`로 고정 (TroubleReport #030)
  - [x] BUG-5: 딜 등록 폼 — `stock <= 0` 유효성 검사 추가
  - [x] BUG-6: `DealProvider._load()` — `_disposed` 플래그 없어 위젯 소멸 후 `notifyListeners()` 호출
  - [x] BUG-7: `WishlistProvider.toggle()` — DB 실패 시 로컬 상태 롤백 추가
  - [x] BUG-8: `ReservationProvider.complete/cancel()` — 로컬 상태 먼저 변경 → DB 실패 시 불일치 (순서 역전)
  - [x] BUG-9: `LocationProvider` — 권한 거부/영구거부 시 에러 메시지 누락 추가
- [x] **전체 리팩토링 Phase 1~3** (2026-08-14)
  - [x] `Formatters.price()` — 가격 3자리 콤마 포매팅 유틸 추출
  - [x] `GeoUtils.haversine()` — Haversine 거리 계산 유틸 추출
  - [x] `StatusColors.foreground/background()` — 예약 상태 색상 유틸 추출
  - [x] `AppLogger.error/info()` — 통합 로거 (kDebugMode 조건부)
  - [x] `AppConfig` — `String.fromEnvironment` 환경 변수 관리 클래스
  - [x] Mock 데이터 fallback 복원 — Supabase 빈 경우 `mockDeals` 표시
  - [x] `flutter analyze` — No issues found (info 2건만 남음, 빌드 무관)
- [x] **거리 제한 3km 적용** (당근마켓 스타일, 2026-08-14)
  - [x] `DealDetailScreen` — 3km 초과 시 오렌지 경고 배너 표시
  - [x] 예약 버튼 — 3km 초과 시 비활성화 + 거리 표시 텍스트
  - [x] 시뮬레이터/해외 GPS — 동네 중심 50km 초과 시 중심 좌표 fallback
- [x] **알림 화면 전면 개선** (2026-08-14)
  - [x] 구분선 색상 — 검정 → 연회색 (`Colors.grey[200]`, thickness 0.5)
  - [x] 알림 탭 → 딜 미리보기 팝업 다이얼로그 (`showDialog` barrierDismissible)
  - [x] 팝업 이미지 탭 → `PageRouteBuilder` FadeTransition+SlideTransition으로 딜 상세 이동 (280ms)
  - [x] "탭하여 상세보기" 힌트 오버레이 (이미지 우하단)
  - [x] "상세보기" 버튼 → `SizeTransition` 슬라이드 딜 소개 펼침/접힘
  - [x] "구매하기" 버튼 → 팝업 닫고 딜 상세 화면 이동
  - [x] "모두 읽음" 버튼 → 시스템 알림 전체 제거 + unread dot 초기화 (실기능 구현)
  - [x] `_NotifTile` — `Container` → `Material` 래핑 (잉크 스플래시 정상화)
- [x] **실기기 설치 완료** — GreenVision iPhone (iOS 26.5.2) USB-C 연결, release 모드 7일 유효
- [x] **Git push** — github.com/daoulee/Time_Deal.git (README 충돌 해결 후 완료, 2026-08-13)
- [x] 전체 플로우 E2E 테스트 (소비자 / 사장님 기기 동시 및 가결제/스마트티켓/취소내역/Fallback 종합 검증 완료, 2026-08-21)

### 3-B. 문서 정리
- [x] `Report.md` 업데이트 (2026-08-08)
- [x] `TroubleReport.md` 업데이트 (#018~#029 추가)
- [x] `TodoList.md` 업데이트
- [x] `README.md` 최종 정리 (2026-08-09)
- [x] `DemoScript.md` 작성 (2026-08-09)

### 3-C. 발표 리허설
- [ ] 두 기기 동시 데모 리허설 (3회 이상)
- [ ] 발표 사이트 최종 확인
- [x] Supabase 무료 티어 usage 확인 (REST API 정상 쿼리 및 rate limit 안전 확인, 2026-08-21)
- [x] **Supabase SQL Editor에서 `supabase_setup.sql` 실행** (decrement_stock RPC 등록, 2026-08-10)

---

## ✅ 완료된 항목 (누적)

- [x] 타임딜 피드 — Supabase Realtime 실시간 동기화
- [x] 딜 예약 → 재고 감소 → 예약 내역 반영
- [x] 찜하기 / 찜 목록 (wishlists 테이블 연동)
- [x] 카운트다운 타이머 / 재고 게이지 (품절 상태 포함)
- [x] 검색, 알림, 가게 보기, 공유
- [x] 동네 설정 / 다크모드 (SharedPreferences 영속화)
- [x] 사장님 대시보드 실시간 통계
- [x] 딜 등록 — 카테고리 선택 + 사진 업로드 + 가격 콤마 포매팅
- [x] 딜 관리 (전체/진행중/픽업완료 탭, 픽업확인/취소)
- [x] Google Maps 연동 + 커스텀 마커 + 슬라이드업 딜 카드
- [x] GPS 실위치 → Haversine 거리 → 거리순 정렬 + 시뮬레이터 fallback
- [x] 앱 아이콘 "Deal" 커스텀 + 앱 이름 국제화 ("타임딜" / "Town Flash Deal")
- [x] 스플래시 → 로그인 자연스러운 FadeTransition
- [x] 소셜 로그인 버튼 아이콘 (카카오/네이버/구글)
- [x] my_page 섹션 구분선 iOS Settings 스타일
- [x] 보안 취약점 3종 수정 (데이터 유출 / 레이스 컨디션 / 이중예약)
- [x] 내부 결함 4종 수정 (대시보드 getter / 딜 필드 누락 / discountPercent / 지도 동네명)
- [x] my_page 동네명 실시간 바인딩
- [x] flutter analyze No issues found (빌드 에러 0)
- [x] 거리 제한 3km — 3km 초과 딜 예약 불가 (당근마켓 스타일)
- [x] 알림 화면 — 딜 미리보기 팝업 (이미지 탭 → 상세 전환, 상세보기 슬라이드, 모두 읽음 기능)
- [x] 기능 결함 9종 수정 (ChangeNotifier 생명주기 / 롤백 / 타이머 음수 / 권한 에러 메시지 등)
- [x] 전체 리팩토링 — Formatters / GeoUtils / StatusColors / AppLogger / AppConfig 유틸 분리
- [x] Mock 데이터 fallback 복원 (Supabase 빈 경우 데모 가능)
- [x] cancel() 재고 복구 atomic increment_stock RPC 추가 및 레이스 컨디션 해결 (2026-08-21)
- [x] Supabase Auth 세션 기반 인증 연동 + DeviceId fallback 지원 (2026-08-21)
- [x] RLS(Row Level Security) 정책 강화 (2026-08-21)
- [x] Google Maps iOS 신규 API 키 교체 (2026-08-21)
- [x] Google & Kakao 소셜 로그인 연동 완료 (2026-08-21)
- [x] 로그인 완료 하단 팝업 알림 (AuthFeedback.showLoginToast) (2026-08-21)
- [x] 회원가입 완료 햅틱 진동 + 화면 중앙 시그니처 오렌지 체크 애니메이션 (AuthFeedback.showSignUpSuccess) (2026-08-21)
- [x] 사용자 실제 GPS(안양시 비산동 등) 기반 동적 데모 딜 & 지도 핀 생성 (2026-08-21)
- [x] 초기 로그인 화면 3종 버튼 통합 (소셜 로그인 2초 로고 페이드 회전 + 회원가입 + 게스트) (2026-08-21)
- [x] 소셜 로그인 회전 로고 브랜드 고유 배지(카카오 노랑, 구글 흰색, 이메일 주황) 및 고대비 화이트 버튼 스타일 적용 (2026-08-21)
- [x] 로그인 화면 섹션 구분선 적용 ("이미 계정이 있으신가요?" / "처음이신가요?") 및 카카오/구글 3초 소셜 회원가입 통합 (2026-08-21)
- [x] 미가입 계정 로그인 시도 시 "회원가입이 안 된 계정이네요!" 안내 모달 및 원클릭 회원가입 전환 연동 (2026-08-21)
- [x] 사용자 설정 반경(1km, 3km, 5km, 10km) 기반 지도 딜 필터링 + Google Map 반경 원(Circle) 시각화 + 반경 선택기 연동 (2026-08-21)
- [x] UI 전반 유니코드 이모지 100% 제거 및 LucideIcons 벡터 아이콘 통일 (2026-08-21)
- [x] 사장님 딜 등록 7종 추천 상품 퀵 프리셋 갤러리 추가 (2026-08-21)
- [x] 대여킥보드(SWING)형 노쇼 방지 가결제(Hold) & 픽업 시 100% 자동 취소(0원 결제) 시스템 구축 (2026-08-21)
- [x] 타임딜 목록 부드러운 스태거드(Staggered) 슬라이드 & 페이드업 애니메이션 탑재 (2026-08-21)
- [x] 플로팅 캡슐 내비게이션 바 테마 일체화 (White Crystal Glass, sigma 24 블러) (2026-08-21)
- [x] 실물 영수증 티켓 스타일 '스마트 픽업 티켓 화면' 신규 탑재 (가상 바코드, 길찾기/전화 연결, 초단위 카운트다운) (2026-08-21)
- [x] 예약 완료 시 Curves.easeOutBack 스프링 '예약 완료 !' 미니 팝업 모달 탑재 (2026-08-21)
- [x] '취소내역' 탭 분리 및 조용한 아카이브 카드 UI 개편, Pull-to-Refresh 당겨서 새로고침 탑재 (2026-08-21)
- [x] Supabase DB 스키마 Fallback Insert/Update 및 게스트-회원 통합 Auth 식별자 동기화 (2026-08-21)
- [x] 안양 대림대학교 기준 6종 신선한 타임딜 Supabase DB 재삽입 및 라이브 연동 (2026-08-21)
- [x] 실기기 설치 (GreenVision iPhone, iOS 26.5.2, USB-C, release 모드)
- [x] Git push — github.com/daoulee/Time_Deal.git

---
> 📝 **마지막 수정:** 2026-08-21 | **수정자:** Antigravity (Gemini 3.7 Flash)

