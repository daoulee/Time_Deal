# 🧠 Town Flash Deal (우리 동네 타임딜) — 영구 메모리 및 컨텍스트 스냅샷

> **마지막 동기화 일시:** 2026-08-21T15:43:00+09:00  
> **기록자:** Antigravity (AGY)  
> **프로젝트 위치:** `/Users/daul/Desktop/Prototype/town_flash_deal`  
> **원격 Git 저장소:** `https://github.com/daoulee/Time_Deal.git` (`origin/main`)

---

## 📱 1. 실기기(Hardware) 환경 및 배포 정보
- **타겟 기기:** 사용자 실기기 iPhone 16 Pro Max (`GreenVision`, iOS 26.5.2)
  - **USB Hardware UDID:** `00008140-000A2D820CE0801C`
  - **macOS CoreDevice ID (`devicectl`):** `AE8BC26A-DC93-5F4D-935B-3883334E28C5`
- **표준 빌드 및 설치 명령어:**
  ```bash
  # 릴리즈 빌드 (아이콘 트리쉐이킹 방지 필수)
  /Users/daul/flutter/bin/flutter build ios --release --no-tree-shake-icons

  # GreenVision 실기기 설치
  xcrun devicectl device install app --device AE8BC26A-DC93-5F4D-935B-3883334E28C5 build/ios/iphoneos/Runner.app

  # 앱 실행
  xcrun devicectl device process launch --device AE8BC26A-DC93-5F4D-935B-3883334E28C5 com.example.townFlashDeal
  ```

---

## 🚫 2. 엄격한 개발 및 디자인 규칙 (Strict Rules)
1. **유니코드 이모지 완전 금지 (`절대 아이콘이모지는 안돼`)**:
   - 버튼, 타이틀, 스낵바, 카드 등에 유니코드 이모지(💳, 🌱, 🎉, 🥐, 🍣 등) 사용 절대 금지.
   - 반드시 **`LucideIcons` 등의 정갈한 벡터 아이콘** 또는 **순수 텍스트**로만 작성.
2. **에이전트 3인 통일 주석 포맷**:
   - `// [이름 | YYYY-MM-DD] 수정범위: {함수명/위젯명} — {수정 요약}`
3. **사용자 식별자(Auth & Guest) 일원화 원칙**:
   - `_userId = Supabase.instance.client.auth.currentUser?.id ?? DeviceId.value`
   - 로그인 사용자는 Supabase 계정에 데이터가 바인딩되고, 비로그인(게스트) 사용자는 기기 고유 UUID로 즉시 탐색/예약/찜하기 100% 정상 작동.
4. **Supabase Schema Fallback 안전 원칙**:
   - 원격 DB의 컬럼 마이그레이션 유무와 무관하게 앱이 100% 정상 동작하도록 모든 쿼리에 Graceful Fallback 구현.

---

## 🏗️ 3. 핵심 아키텍처 및 구현 기능

### ① 대여킥보드(SWING) 방식 노쇼 방지 가결제 안심 시스템
- **소비자 예약 시**: `신용/체크카드`, `토스페이`, `카카오페이` 선택 후 보증금(상품금액) 가결제(Hold) 처리
- **매장 방문 픽업 시**: 사장님이 현장 포스기 결제 확인 후 픽업 완료 누르면 가결제가 **100% 즉시 0원으로 자동 취소(환불)**
- **소비자 취소 시**: 가결제 즉시 자동 해제
- **노쇼(미방문) 시**: 사장님이 노쇼 처리 시 보증금이 손실 보전 위약금으로 매입(captured)

### ② 스마트 픽업 티켓 화면 (`pickup_ticket_screen.dart`)
- 실물 영수증 느낌의 절취선 펀칭 홈 + 정밀 가상 바코드 + 예약번호(`#FD-XXXXXX`) 원터치 복사 칩
- 픽업 마감 시간 초단위 실시간 카운트다운 (30분 미만 임박 시 레드 경고 박스 자동 전환)
- Apple Maps / Google Maps 자동 연동 원터치 '길찾기' 딥링크 + 사장님 '매장 전화' 원클릭 연결
- 현장 수령 3초 체크리스트 가이드

### ③ 감성적인 '예약 완료 !' 스프링 팝업 모달 (`deal_detail_screen.dart`)
- 예약 완료 즉시 `Curves.easeOutBack` 스프링 애니메이션으로 통통 튀며 화면 중앙에 등장
- 가결제 보증금 및 안심 안내 요약, `[스마트 티켓 확인하기]` 원터치 전환

### ④ '취소내역' 탭 격리 및 Pull-to-Refresh (`reservation_screen.dart`)
- 탭 구성: `[진행중]`, `[픽업완료]`, `[취소내역]`
- 취소된 건은 불필요한 티켓 버튼을 없애고 조용한 회색 아카이브 카드로 깔끔하게 정리
- 언제든 아래로 당겨 Supabase 최신 상태로 재동기화하는 `RefreshIndicator.adaptive` 탑재
- 마이페이지 요약 통계에서 취소 건을 제외하고 실제 유효 예약 건수만 정확히 집계

### ⑤ 홈 피드 스태거드 슬라이드-업 애니메이션 & 플로팅 캡슐 내비바
- 카테고리 전환 및 새로고침 시 차례로 미끄러져 들어오는 부드러운 스태거드(Staggered) 모션 (`Curves.easeOutQuart`)
- White Crystal Glass (`sigma 24` 블러) + 오렌지 시그니처 액티브 탭 플로팅 내비바

---

## 🗄️ 4. Supabase DB & 백엔드 현황
- **Project URL:** `https://gnrnsbuqmofcjoamjsqk.supabase.co`
- **Publishable Key:** `sb_publishable_s6iikkgXxBka9Uo9R0fN7A_qgQqG_YI`
- **주요 테이블:**
  - `deals`: 타임딜 마스터 (안양 대림대학교 반경 500m 6종 딜 실시간 라이브 중)
    1. `대림 브레드카페` - 마감 식빵 + 크루아상 세트 (5,000원)
    2. `비산 할머니 분식` - 떡볶이 + 찰순대 마감 세트 (3,500원)
    3. `카페 모카 비산점` - 아이스 아메리카노 2잔 + 디저트 (5,000원)
    4. `비산 신선마트` - 유통기한 임박 샐러드 & 과일팩 (2,500원)
    5. `꽃향기 플라워 비산점` - 오늘의 마감 미니 생화 꽃다발 (6,500원)
    6. `한솥 비산점` - 수제 도시락 마감 특가 세트 (6,000원)
  - `reservations`: 예약 및 가결제 라이프사이클 관리
  - `wishlists`: 찜한 타임딜
- **RPC 함수:** `decrement_stock(deal_id uuid)`, `increment_stock(deal_id uuid)`
- **Realtime 채널:** `deals-all`, `reservations-all`

---

## 📁 5. 문서 및 협업 보드
- `COMMUNICATE.md`: Claude, Antigravity, Kiro 전용 3자 Handoff 소통 보드 (최신화 완료)
- `TodoList.md`: 프로젝트 마일스톤 및 완료 항목 체크리스트 (전 개발 항목 완료)
- `Report.md`, `TroubleReport.md`: 버그 추적 및 장애 해결 보고서
