# TroubleReport — 우리 동네 타임딜

> 개발 중 발생한 이슈 및 해결 기록  
> 마지막 업데이트: 2026-08-09 (Phase 3-A 내부 결함 검증)

---

## #001 · DealProvider.createFromForm 파라미터 불일치

**발생 시점**: 딜 등록 화면(deal_create_screen) 신규 기능 추가 후  
**증상**: `flutter analyze` 에러 — `id`, `storeCategory`, `iconName`, `imageUrl` 파라미터 누락  
**원인**: `deal_create_screen.dart`에서 새 파라미터로 호출했지만 `DealProvider.createFromForm`은 이전 시그니처 그대로였음  
**해결**: `deal_provider.dart`의 `createFromForm`에 `id`, `storeCategory`, `iconName`, `imageUrl` 파라미터 추가. `storeId`도 하드코딩 `'s1'` → `DeviceId.value`로 교체

---

## #002 · Reservation 모델 userId 추가 후 optimistic insert 누락

**발생 시점**: 사장님 딜 관리 화면에서 고객 이름 표시를 위해 `Reservation.userId` 필드 추가 후  
**증상**: 런타임 에러 — `Missing required argument: userId`  
**원인**: `reservation_provider.dart`의 `reserve()` 함수에서 optimistic insert 시 `Reservation` 생성 코드에 `userId` 인자 미전달  
**해결**: `reserve()` 내 임시 Reservation 생성 시 `userId: DeviceId.value` 추가

---

## #003 · flutter build 에서 -q 플래그 미지원

**발생 시점**: Stop hook 설정 시 빌드 로그를 줄이기 위해 `-q` 플래그 사용  
**증상**: `Could not find an option named "q"` 에러로 Stop hook 빌드 실패  
**원인**: `flutter build ios`는 `-q` (quiet) 플래그를 지원하지 않음  
**해결**: Stop hook 커맨드에서 `-q` 제거. 빌드 로그는 백그라운드(`async: true`)로 돌아가므로 실용상 문제 없음

---

## #004 · withOpacity deprecated (31건)

**발생 시점**: Flutter SDK 업데이트 후 `flutter analyze` 실행 시  
**증상**: `info` 수준 경고 31건 — `'withOpacity' is deprecated, use .withValues() instead`  
**원인**: 기존 코드 전반에서 `Color.withOpacity(x)` 패턴 사용, 신규 API는 `withValues(alpha: x)`  
**해결**: 6개 파일에 `sed` 일괄 치환 (`s/\.withOpacity(\([^)]*\))/.withValues(alpha: \1)/g`). 이후 `No issues found`

---

## #005 · (_, __) unnecessary_underscores 경고

**발생 시점**: #004 해결 후 `flutter analyze` 재실행 시  
**증상**: `info` 수준 경고 5건 — `Unnecessary use of multiple underscores, use '_' instead`  
**원인**: `separatorBuilder: (_, __) =>`, `errorWidget: (_, __, ___) =>` 등에서 사용하지 않는 파라미터를 `__`, `___`로 표기  
**해결**: `(_, __) =>` → `(_, _) =>`, `(_, __, ___) =>` → `(_, _, _) =>`로 수정. `splash_screen.dart`의 `PageRouteBuilder`도 동일하게 수정

---

## #006 · bottom_nav_bar.dart — const record에 LucideIcons 상수 불가

**발생 시점**: BottomNavBar UX 리팩토링 중 `_navItems`를 `static const`로 선언 시  
**증상**: `error — The fields in a const record literal must be constants`  
**원인**: `LucideIcons.home` 등 Lucide 아이콘 값이 컴파일타임 const가 아님  
**해결**: `static const _navItems` → `static final _navItems`로 변경

---

## #007 · google_maps_flutter — zIndex deprecated

**발생 시점**: Google Maps 연동 후 `flutter analyze` 실행 시  
**증상**: `info — 'zIndex' is deprecated, use zIndexInt instead`  
**원인**: `google_maps_flutter` 최신 버전에서 `Marker.zIndex`(double) → `Marker.zIndexInt`(int)로 변경됨  
**해결**: `zIndex: isSelected ? 2 : 1` → `zIndexInt: isSelected ? 2 : 1`

---

## #008 · google_maps_flutter — setMapStyle deprecated

**발생 시점**: Google Maps 다크모드 스타일 적용 시  
**증상**: `info — 'setMapStyle' is deprecated, use GoogleMap.style instead`  
**원인**: 기존 `controller.setMapStyle(json)` API가 deprecated, `GoogleMap` 위젯의 `style` 파라미터로 대체됨  
**해결**: `_onMapCreated`에서 `controller.setMapStyle()` 호출 제거 → `GoogleMap(style: isDark ? _darkMapStyle : null)` 방식으로 변경

---

## #009 · iOS Deployment Target 13.0 → 14.0 필요

**발생 시점**: `google_maps_flutter` 패키지 추가 후 빌드 시  
**증상**: pod install 시 `google_maps_flutter_ios requires iOS 14.0 or higher` 에러  
**원인**: `google_maps_flutter` iOS SDK가 iOS 14.0 이상을 요구하는데 프로젝트 최소 타겟이 13.0이었음  
**해결**:  
- `ios/Podfile`: `platform :ios, '14.0'` 주석 해제 및 버전 변경  
- `ios/Runner.xcodeproj/project.pbxproj`: `IPHONEOS_DEPLOYMENT_TARGET = 13.0` → `14.0` (3곳 일괄 sed 치환)

---

## #010 · flutter run 두 시뮬레이터 동시 실행 시 PID 충돌 없음 확인

**발생 시점**: 양쪽 시뮬레이터 동시 `flutter run` 시  
**증상 (우려)**: 두 프로세스가 동일 포트 또는 리소스 충돌 가능성  
**결과**: `-d {UDID}` 플래그로 각각 별도 타겟 지정 시 충돌 없이 독립 실행 가능  
**결론**: 백그라운드 `&` 로 각각 실행하면 문제 없음. `flutter run`은 기기별로 독립 프로세스

---

## #011 · Supabase Realtime 채널명 충돌 (소비자/사장님)

**발생 시점**: 사장님 딜 관리 화면에서 전체 예약을 실시간으로 받아야 할 때  
**증상**: 소비자용 채널(`reservations-{DeviceId}`)만 구독 중이라 사장님 화면에서 다른 기기의 예약이 실시간 반영 안 됨  
**원인**: `ReservationProvider`가 `user_id` 필터 포함된 단일 채널만 구독  
**해결**: 채널명을 `reservations-all`로 통합, 소비자용 쿼리(`_load`)와 사장님용 쿼리(`_loadMerchant`)를 분리 운영. 한 채널의 이벤트로 두 쿼리 모두 재호출

---

## #012 · Supabase Realtime Publication 오류 (42710)

**발생 시점**: Supabase SQL Editor에서 `CREATE PUBLICATION` 실행 시  
**증상**: `ERROR 42710: publication "supabase_realtime" already exists` 또는 `ERROR: relation already exists in publication`  
**원인**: 기존 publication에 테이블이 이미 추가되어 있었음  
**해결**: `DO $$ BEGIN ... EXCEPTION WHEN ... THEN NULL; END $$;` 블록으로 감싸 이미 존재하는 경우 오류를 무시하도록 처리

---

## #013 · Supabase INSERT UUID 오류 (22P02)

**발생 시점**: 목 데이터 시드 INSERT SQL 실행 시  
**증상**: `ERROR 22P02: invalid input syntax for type uuid: "d1"`  
**원인**: INSERT문에 `id: 'd1'` 등 단축 문자열 id를 명시했지만 컬럼 타입이 uuid임  
**해결**: INSERT 시 `id` 컬럼을 명시하지 않아 `gen_random_uuid()`(default) 자동 생성으로 처리

---

## #014 · google_maps_flutter — zIndex deprecated (중복 기록)

> #007과 동일 이슈 재발. 별도 파일 수정 시 누락된 케이스  
**해결**: 전체 파일 grep으로 잔여 `zIndex` 검색 후 일괄 수정

---

## #015 · google_maps_flutter — setMapStyle deprecated (중복 기록)

> #008과 동일 이슈. 다른 분기 코드에서 재발  
**해결**: 해당 분기 제거

---

## #016 · 찜 목록 — mockDeals 하드코딩 참조로 실 딜 필터링 불가

**발생 시점**: Phase 3-A 코드 리뷰 중  
**증상**: Supabase에서 로드된 딜을 찜해도 찜 목록 화면에 아무것도 표시 안 됨  
**원인**: `wishlist_screen.dart`에서 `mockDeals.where((d) => wl.isLiked(d.id))` 참조 — `mockDeals`는 하드코딩 fallback 데이터라 Supabase UUID와 id가 불일치  
**해결**: `context.watch<DealProvider>().deals`로 교체하여 실제 로드된 딜 목록에서 필터링

---

## #017 · 딜 카드 거리 표시 — 소수점 과다 출력

**발생 시점**: Phase 3-A 코드 리뷰 중  
**증상**: 딜 카드 및 딜 상세에서 거리가 `1.2345678km` 형태로 표시됨  
**원인**: `deal.distanceKm.toString()` 사용 시 Dart의 double 기본 출력이 과도한 소수점 포함  
**해결**: `deal.distanceKm.toStringAsFixed(1)` 적용, 1km 미만은 `${(distanceKm * 1000).round()}m` 형태로 표시

---

## #018 · 시뮬레이터 GPS — Apple HQ 좌표 (9025km 표시)

**발생 시점**: 2026-08-07, 시뮬레이터에서 딜 상세 거리 확인 시  
**증상**: 딜 상세 화면에서 거리가 `9025.3km`로 표시됨  
**원인**: iOS 시뮬레이터 기본 GPS 좌표가 Apple HQ (Cupertino, CA, USA)로 고정됨. 딜 좌표는 서울 성수동 → 실제로 약 9,000km 거리  
**해결**: `DealProvider.updateDistances()`에 50km 임계값 검사 추가  
```dart
if (_haversine(userLat, userLng, refLat, refLng) > 50.0) {
  _lastLat = refLat; _lastLng = refLng;  // 동네 중심으로 fallback
} else {
  _lastLat = userLat; _lastLng = userLng;
}
```
HomeScreen에서 `neighborhoodCoords`로 동네별 중심 좌표도 함께 전달

---

## #019 · 스플래시 → 로그인 화면 겹침

**발생 시점**: 2026-08-07, 스플래시 → 로그인 전환 시  
**증상**: 스플래시가 아직 화면에 있는 상태에서 로그인 화면이 바로 나타나 두 화면이 겹쳐 보임  
**원인**: `_fadeController.reverse()` 없이 바로 `Navigator.pushReplacement()` 호출  
**해결**: 네비게이션 전에 `await _fadeController.reverse()` 먼저 완료 → 스플래시 완전 페이드아웃 후 `PageRouteBuilder(transitionDuration: 350ms, FadeTransition)` 으로 자연스럽게 전환

---

## #020 · Kakao SVG — 배경 rounded-rect 내장 (Simple Icons)

**발생 시점**: 2026-08-07, 로그인 화면 소셜 아이콘 구현 중  
**증상**: 노란 버튼 위에 카카오 아이콘을 넣었는데 어두운 둥근 사각형이 아이콘 위에 덮여 표시됨  
**원인**: Simple Icons의 KakaoTalk SVG는 viewBox 전체를 채우는 rounded-rect 배경 path가 아이콘 path와 단일 `<path>` 안에 합쳐져 있음 (`M22.125 0H1.875...0z` 가 배경)  
**해결**: 두 subpath를 분리하여 배경 path 제거, 아이콘 path만 별도 SVG로 저장

---

## #021 · pbxproj — PBXVariantGroup에 PBXBuildFile wrapper 누락

**발생 시점**: 2026-08-07, iOS 앱 이름 한국어 현지화를 위해 `InfoPlist.strings` 추가 시  
**증상**: 빌드 성공이나 앱 아이콘 탭 시 `[application:didFailToRegisterForRemoteNotificationsWithError]` 유사 오류 또는 `unrecognized selector` 크래시  
**원인**: `InfoPlist.strings` VariantGroup을 `PBXResourcesBuildPhase`에 직접 추가했으나, Xcode pbxproj 구조상 VariantGroup은 반드시 `PBXBuildFile` 래퍼를 통해 참조해야 함  
**해결**:  
1. PBXFileReference 2개 (en/ko lproj) 추가  
2. PBXVariantGroup 생성 (두 FileReference 포함)  
3. **PBXBuildFile 추가** (VariantGroup을 fileRef로 참조) ← 이 단계 누락이 원인  
4. PBXResourcesBuildPhase에는 PBXBuildFile ID 추가

---

## #022 · 사용자 제공 PNG 아이콘 — 경계선만 존재 (96×96)

**발생 시점**: 2026-08-07, 사용자가 `assets/icons/` 폴더에 PNG 파일 제공 시  
**증상**: `google.png`, `kakao.png`, `naver.png` 모두 96×96 RGBA이지만 이미지 거의 투명 (유효 픽셀 1% 미만)  
**원인**: 파일 분석 결과, 해당 PNG들은 아이콘 형태의 테두리선만 존재하는 불완전한 파일이었음. 제대로 된 로고 이미지가 아님  
**해결**: SVG 방식으로 전환 (kakao.svg, naver.svg 직접 제작), Google은 `google-logo.png` (800×800 RGBA) 별도 제공 파일 사용

---

## #023 · Kakao SVG 소형 렌더링 — 복잡한 path가 "A" 글자처럼 보임

**발생 시점**: 2026-08-07, Simple Icons path를 배경 없이 렌더링 시  
**증상**: 노란 버튼 위에 카카오 아이콘이 영문 "A" 처럼 보임  
**원인**: KakaoTalk CI 내부 path (T, K, A, K, A, O 글자 형태의 복잡한 경로)가 28px 이하 소형 크기에서 개별 획이 뭉쳐 특정 알파벳처럼 보이는 렌더링 현상  
**해결**: Simple Icons path 포기. 단순한 말풍선 기하 도형(`M50 4C24.6...`)으로 교체하여 어떤 크기에서도 말풍선으로 인식 가능하도록 개선

---

## #024 · 상인 예약 데이터 유출 — store_id 필터 없음

**발생 시점**: 2026-08-07, 시스템 보안 검증 중  
**증상**: 사장님 탭에서 자기 딜이 아닌 모든 유저의 예약이 노출됨  
**원인**: `ReservationProvider._load()`의 merchant 쿼리가 `store_id` 필터 없이 `reservations` 전체 조회  
**해결**: 쿼리 방향 변경 — `deals` 테이블에서 `store_id = DeviceId.value` 필터 후 해당 딜의 `reservations` 조인  
```dart
final myDeals = await _supabase
    .from('deals')
    .select('id, reservations(*)')
    .eq('store_id', DeviceId.value);
// flat map → Reservation.fromJson()
```

---

## #025 · 재고 레이스 컨디션 — 동시 예약 시 음수 재고 가능

**발생 시점**: 2026-08-07, 시스템 보안 검증 중  
**증상**: 두 기기에서 마지막 재고 1개를 동시에 예약하면 둘 다 성공 → `remaining_stock = -1`  
**원인**: 클라이언트에서 `deal.remainingStock - 1` 연산 후 UPDATE — read-modify-write 패턴으로 동시성 보장 불가  
**해결 (2단계)**:  
1. 클라이언트: `reserve()` 진입 시 `remainingStock <= 0` 사전 차단  
2. DB: Supabase RPC `decrement_stock` — Postgres 서버에서 `remaining_stock > 0` 조건 확인 후 atomic UPDATE  
   - RPC 미생성 시 fallback: `.gt('remaining_stock', 0)` 조건부 UPDATE로 음수 방지  
3. `supabase_setup.sql` 작성 (Dashboard SQL Editor에서 실행 필요)

---

## #026 · 사장님 대시보드 — 소비자 예약 목록 참조 오류

**발생 시점**: 2026-08-09, 내부 결함 검증 중  
**증상**: 사장님 대시보드의 진행중/픽업완료 건수, 누적 매출, 최근 주문 목록이 실제 고객 예약이 아닌 사장님 본인의 소비자 예약을 표시  
**원인**: `merchant_home_screen.dart`에서 `rp.byStatus()` / `rp.all` 호출 — 이는 `_reservations`(소비자 본인 예약)를 반환하는 getter. 사장님용 `merchantByStatus()` / `merchantAll`을 사용해야 함  
**해결**: `rp.byStatus(...)` → `rp.merchantByStatus(...)`, `rp.all` → `rp.merchantAll` 로 전체 교체 (4곳)

---

## #027 · 사장님 예약 조회 — deals 테이블 join 필드 누락으로 Deal.fromJson crash

**발생 시점**: 2026-08-09, 내부 결함 검증 중  
**증상**: 사장님 대시보드에 예약 목록이 항상 비어 있음. 에러는 provider try-catch에 의해 무음 처리됨  
**원인**: `reservation_provider.dart` 상인 쿼리가 `.select('id, reservations(*)')`로 `deals` 테이블에서 `id`만 선택 → `Deal.fromJson`이 `store_name`, `title` 등 필수 필드를 null cast로 throw  
**해결**: `.select('*, reservations(*)')` 로 변경해 전체 deal 컬럼 포함

---

## #028 · Deal.discountPercent — originalPrice=0 시 NaN.round() throw

**발생 시점**: 2026-08-09, 내부 결함 검증 중  
**증상**: DB에 `original_price=0` 데이터 유입 시 `deal.discountPercent` 호출 → `double.nan.round()` → `UnsupportedError` crash  
**원인**: `(0 - x) / 0 * 100` = `double.nan`, Dart에서 `double.nan.round()`는 throw  
**해결**: `originalPrice == 0` 방어 조건 추가 — 0이면 0 반환

---

## #029 · MapScreen — 동네명 하드코딩 '성수동 2가'

**발생 시점**: 2026-08-09, 내부 결함 검증 중  
**증상**: 동네 설정 변경 후 지도 상단 검색바가 항상 '성수동 2가' 표시  
**원인**: 지도 상단 위치 텍스트에 `const Text('성수동 2가')` 하드코딩  
**해결**: `loc.neighborhood` 바인딩으로 교체 (loc은 이미 `context.watch<LocationProvider>()`로 구독 중)
