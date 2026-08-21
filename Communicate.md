# 🤝 AI Developer Team Communication Board (COMMUNICATE.md)

우리 동네 타임딜(Town Flash Deal) 프로젝트를 함께 개발하는 AI 에이전트 팀(**Claude**, **Antigravity (AGY)**, **Kiro**)의 전용 소통 및 핸드오프 문서입니다.  
각 에이전트는 작업을 시작할 때 이 문서를 확인하고, 작업 완료 시 자신의 영역에 진행 상황 및 다른 에이전트에게 남길 메시지를 업데이트합니다.

---

## 📌 팀 공통 절대 수칙
1. **주석 표기 표준 준수**:
   - Claude: `// AI-EDIT: Claude — YYYY-MM-DD — L범위 수정 (설명)`
   - Antigravity: `// [Antigravity | YYYY-MM-DD] 수정범위: {함수명/위젯명} — {수정 요약}`
   - Kiro: `// [Kiro | YYYY-MM-DD] 수정범위: {함수명/위젯명} — {수정 요약}`
2. **문서 갱신**:
   - 코드 변경 시 `TodoList.md` 및 본 `COMMUNICATE.md` 최신화
   - 문서 하단에 `> 📝 **마지막 수정:** YYYY-MM-DD | **수정자:** {에이전트명}` 서명 유지

---

## 1. 🚀 Antigravity (AGY) 영역
> **담당:** UI/UX 모더니제이션, Google Maps & GPS 연동, OAuth 로그인/가입 플로우, 실기기 빌드 및 배포

### 📋 최근 완료 작업 (2026-08-21)
- **Google & Kakao OAuth 100% 정상화**:
  - Supabase URL Configuration 및 custom scope/queryParams 정리 (`Unable to exchange external code` 해결)
- **로그인/가입 시각 피드백 (`AuthFeedback`)**:
  - 로그인 성공: 하단 플로팅 다크 카드 알림 (`AuthFeedback.showLoginToast`)
  - 회원가입 성공: 햅틱 진동 + 화면 중앙 시그니처 오렌지 체크 애니메이션 (`AuthFeedback.showSignUpSuccess`)
- **사용자 실제 GPS(안양시 비산동) 동적 데모 딜 생성**:
  - `generateMockDeals()`로 사용자 위치 반경 300~800m 내 맞춤형 딜(`비산 베이커리` 등) 동적 생성
- **초기 로그인 화면 3종 버튼 & 구분선 통합**:
  - `── 이미 계정이 있으신가요? ──` ➔ `소셜 로그인` (2초 주기 카카오/구글/이메일 벡터 로고 페이드 회전)
  - `── 처음이신가요? ──` ➔ `회원가입` (시그니처 오렌지 버튼)
  - `게스트로 둘러보기` (아웃라인 버튼)
- **미가입 계정 로그인 인터셉트 및 안내 모달**:
  - Supabase Auth의 자동 리디렉션(`_onAuthChanged`)을 차단하고 `_handleLogin`에서 `isNewUser`/`isRegistered` 검증
  - 미가입 계정일 경우 `"회원가입이 안 된 계정이네요!"` 모달 띄우고 즉시 가입 전환
- **사용자 설정 반경(1km, 3km, 5km, 10km) 지도 필터링 & Google Map Circle 시각화**:
  - `LocationProvider.radiusKm` 연동, 반경 외 딜 제외 및 지도상에 반경 원(Circle) 렌더링

### 💬 다른 에이전트(Claude, Kiro)에게 남기는 말
- `login_screen.dart`에서 `onAuthStateChange` 리스너로 인한 무조건 화면 전환 문제를 제거했습니다. 소셜 로그인을 통해 들어온 신규 유저는 `is_registered` 메타데이터 확인 후 가입 모달을 거치도록 흐름이 정리되었습니다.
- `LocationProvider.radiusKm`가 `SharedPreferences`에 저장되고 `MapScreen`과 동기화되니, 홈 화면 피드에서도 필요 시 `loc.radiusKm`로 딜을 필터링하도록 연계하면 좋습니다.

---

## 2. 🤖 Claude 영역
> **담당:** 아키텍처 설계, 비즈니스 로직 최적화, 상태 관리 및 데이터 흐름 검증

### 📋 최근 메모 및 진행 사항
- *작업 시 이곳에 메모와 공유 사항을 기록해주세요.*

### 💬 다른 에이전트(AGY, Kiro)에게 남기는 말
- *공유 사항 작성*

---

## 3. ⚡ Kiro 영역
> **담당:** 백엔드/DB(Supabase SQL, RPC, RLS), 데이터 무결성 및 동시성 제어, 디버깅

### 📋 최근 메모 및 진행 사항
- **atomic stock RPC 수정 완료**:
  - `decrement_stock`, `increment_stock` 함수 `deal_id UUID` 타입 매칭 완료
- **RLS 정책 점검**:
  - `deals`, `reservations`, `wishlists` 정책 보강

### 💬 다른 에이전트(AGY, Claude)에게 남기는 말
- *공유 사항 작성*

---

## 💬 실시간 Handoff & 공유 보드
| 날짜 | 발신 | 수신 | 내용 |
|---|---|---|---|
| 2026-08-21 | AGY | All | `COMMUNICATE.md` 보드 개설. 현재 iOS 기기(GreenVision)에 GPS 동적 딜, 반경 필터, 3버튼 로그인 및 미가입 안내 모달 배포 완료. |

---
> 📝 **마지막 수정:** 2026-08-21 | **수정자:** Antigravity (Gemini 3.7 Flash)
