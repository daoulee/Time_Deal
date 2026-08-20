# 타임딜 분리형 풀스택 소스

오렌지 라이트·다크 반응형 디자인을 유지한 고객·판매자·관리자용 Hono + React + Supabase 프로젝트입니다. 한 주문에 여러 판매자 상품을 허용하고 판매자별 `fulfillment_groups`로 분리합니다.

## 구조
```text
backend/   # Hono API, Supabase SQL/migrations, Render 설정
frontend/  # React/Vite, 기능별 src/pages 구조
```
백엔드는 `src/modules/<기능명>/<기능명>Routes.ts`, 프론트는 `src/pages/<기능명>/*.tsx`에서 바로 찾을 수 있습니다. 수동 작성 파일에는 역할을 설명하는 한국어 헤더 주석을 유지합니다.

## 1. Supabase SQL 적용 순서

### 신규 Supabase 프로젝트
1. SQL Editor에서 `backend/supabase/schema.sql`을 한 번 실행합니다. 이 파일은 최초 스키마와 2026-08-19 운영 업그레이드를 모두 포함합니다.
2. 선택적으로 개발 데이터가 필요할 때만 `backend/supabase/seed.sql`을 실행합니다. 운영 DB에는 샘플 seed를 넣지 않습니다.

### 기존 타임딜 스키마 사용 프로젝트
1. 적용 전 Supabase 백업을 생성하고 staging에서 먼저 검증합니다.
2. `backend/supabase/migrations/202608190001_multiseller_operations.sql`을 실행합니다.
3. 기존 주문의 결제 상태는 실제 결제 사실을 가장하지 않도록 `reservation_only` + `not_applicable`로 보정됩니다.
4. 카드 결제(Toss)를 열려면 `backend/supabase/migrations/202608200001_toss_payments.sql`도 실행합니다. `payments` 테이블과 `payment_method='card'`/`payment_status`의 `pending_payment`·`paid`·`payment_failed`·`refunded` 값을 추가합니다.
5. 주문 시 수령 주소(직접 입력 또는 GPS) 입력을 열려면 `backend/supabase/migrations/202608200002_order_delivery_address.sql`도 실행합니다. `orders.delivery_address` 컬럼을 추가합니다.
6. 이후 신규 변경은 `backend/supabase/migrations/`의 파일명 시간순으로만 적용합니다. 기존 DB에 전체 `schema.sql`을 다시 실행하지 않습니다.

마이그레이션은 다음을 추가합니다: 프로필 지역/전화/마케팅, 상품 승인 상태, 주문 `payment_method`·idempotency, 판매자별 fulfillment, 재고 원장, 문의 메시지, 커뮤니티 댓글/반응/신고, 구매 검증 리뷰, 판매자 신청, 감사 로그, 인덱스·RLS, 원자적 주문/취소 RPC, 토스페이먼츠 결제 테이블.

## 2. Supabase Dashboard 설정
1. Authentication → URL Configuration:
   - Site URL: 실제 프론트 주소
   - Redirect URLs: `https://YOUR-FRONTEND/auth`, `https://YOUR-FRONTEND/auth/reset-password`
2. Kakao Provider를 사용할 경우 Supabase Dashboard와 Kakao Developers 양쪽의 callback을 정확히 등록합니다.
3. Storage에 private 또는 정책을 구성한 `product-images` 버킷을 만듭니다. API는 JPG/PNG/WEBP, 기본 최대 5MB의 signed upload URL만 발급합니다.
4. 첫 관리자는 가입 후 SQL Editor에서 신뢰할 계정 UUID에만 `update public.profiles set role='admin' where id='UUID';`를 실행합니다.
5. `SUPABASE_SERVICE_ROLE_KEY`는 Render 서버 Secret에만 둡니다. 프론트/VITE/Git/Issue/스크린샷에 넣지 않습니다.

## 3. 주문·결제 정책
- 한 주문에 서로 다른 판매자 상품을 함께 담을 수 있습니다.
- DB RPC가 주문 아래에 판매자별 `fulfillment_groups`를 만들고, 판매자는 자기 그룹·자기 item·픽업 ID만 봅니다. 다른 판매자의 item과 고객 이메일/프로필은 응답하지 않습니다.
- 주문 방식은 `on_site`(픽업 현장 결제), `reservation_only`(결제 없는 예약), `card`(토스페이먼츠 온라인 카드 결제)를 허용합니다.
- `card` 주문은 `payment_status`가 `pending_payment → paid`(승인 성공) 또는 `payment_failed`(승인 실패)로 바뀌고, 취소 시 결제가 이미 완료됐다면 토스 결제 취소 API를 호출한 뒤 `refunded`로 남깁니다.
- 모든 주문 생성은 `idempotencyKey` 또는 `Idempotency-Key`를 보내 중복 재시도를 같은 주문으로 처리합니다.
- 주문자는 선택적으로 수령 주소(`deliveryAddress`)를 직접 입력하거나 브라우저 GPS + Google Maps Geocoder로 자동 조회해 담을 수 있습니다. 기존 픽업 장소/슬롯 선택과 별개의 참고 정보이며 필수 항목은 아닙니다.
- 백엔드 `TOSS_SECRET_KEY`(및 프론트 `VITE_TOSS_CLIENT_KEY`)가 비어 있으면 카드 결제 옵션 자체가 화면에 노출되지 않고, 승인 API도 503으로 막힙니다. 대회·데모용으로는 `test_sk_`/`test_ck_` 접두사의 **TEST 모드 키**만 사용하세요 — 실제 카드가 승인되지 않고 무료입니다.

## 4. 백엔드 로컬·Render 연결
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
필수 환경변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `AUTH_REDIRECT_ORIGINS`, `PUBLIC_BACKEND_URL`. Storage는 `PRODUCT_IMAGE_BUCKET`, `MAX_IMAGE_BYTES`로 설정합니다. 카드 결제를 열려면 `TOSS_SECRET_KEY`(developers.tosspayments.com 내 개발정보의 테스트 시크릿 키)를 추가합니다.

검사: `npm run lint && npm run typecheck && npm run test && npm run build`
- liveness: `GET /health`
- readiness(Supabase 연결 포함): `GET /ready`
- Render Health Check는 프로세스 생존 확인이면 `/health`, 실제 트래픽 준비 확인이면 `/ready`를 사용합니다.
- 전역 보안 헤더, 1MB 본문 제한, 요청 ID, 메모리 기반 IP rate limit이 적용됩니다. 다중 인스턴스에서는 rate limit 저장소를 Redis 등 공유 저장소로 교체하십시오.
- `ENABLE_SAMPLE_DATA=true`는 개발에서만 허용되며 `NODE_ENV=production`이면 코드가 샘플을 차단합니다.

## 5. 프론트 로컬·배포 연결
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
`VITE_API_BASE_URL`에 Render URL, `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY`에 공개 Auth 값을 넣습니다. 운영에서는 `VITE_ENABLE_SAMPLE_DATA=false`를 유지합니다. 배포 후 프론트 실제 Origin을 백엔드 `ALLOWED_ORIGINS`와 `AUTH_REDIRECT_ORIGINS`에 추가하고 백엔드를 재배포합니다. 카드 결제를 열려면 `VITE_TOSS_CLIENT_KEY`(테스트 클라이언트 키, `test_ck_...`)를 추가합니다 — 브라우저에 공개돼도 안전한 키입니다.

검사: `npm run lint && npm run typecheck && npm run test && npm run build`

## 6. 구현된 주요 운영 경계
- 실제 `RequireSeller`/`RequireAdmin` 프론트 가드 + 서버 역할 재검증
- seller 상품 PATCH strict allowlist, 본인 상품만 편집, 관리자는 사후 moderation으로 개입
- 상품+타임딜 통합 등록(`/seller-products-with-deal`)으로 승인된 판매자는 등록 즉시 판매 시작(=active), 게이트는 판매자 신청(사업자 확인) 승인 하나뿐
- signed Storage 업로드 URL(상품 생성 전에도 발급 가능), 딜 생성, 재고 조정 원장, 판매자 통계
- 멀티셀러 fulfillment 조회/정방향 상태 전이와 최소 정보 DTO
- 비밀번호 재설정 메일의 서버 allowlist redirect + `/auth/reset-password` 완료 화면
- 프로필·관심 지역·주문 파생 참여·수령 완료 주문 기반 리뷰
- 문의 대화/배정/처리, 커뮤니티 게시글/댓글/반응/신고
- 관리자 사용자 정지/role, 판매자 신청 심사, 상품·딜 사후 moderation(숨김·반려·종료), 픽업, 감사 로그, 통계
- 토스페이먼츠 TEST 모드 카드 결제(결제위젯 → 승인 API → 주문 상태 전이, 취소 시 자동 환불 API 호출)
- production sample 자동 폴백 차단, security headers, rate limit, request ID, `/ready`

## 7. 네이버 로그인 연결 지점
현재 미완성 501 콜백과 활성 로그인 버튼은 제거했습니다. `.env.example`의 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_REDIRECT_URI`는 사용자가 별도 구현할 위치만 표시합니다. 실제 활성화 전에는 반드시 다음을 완성해야 합니다.
1. 네이버 code → token → profile 서버 교환
2. Supabase custom OIDC 또는 검증된 Edge Function 계정 연결 방식
3. HMAC/서버 저장 state, origin/path allowlist, 안전한 callback redirect
4. 계정 중복·연결 해제·탈퇴 정책과 통합 테스트
설정값만 입력한다고 현재 UI에서 네이버 로그인이 자동 활성화되지는 않습니다.

## 8. 외부 조건 때문에 별도 완료가 필요한 항목
- 카드 결제는 토스페이먼츠 **TEST 모드**(승인/취소 API 연동, `payments` 테이블)만 구현했습니다. 실 서비스 정산·영수증·부분취소·웹훅 서명 검증은 상점 심사를 통과한 라이브 키(`live_`)로 전환한 뒤 별도로 완료해야 합니다.
- 네이버 Developers와 Supabase identity bridge 설정은 사용자가 별도로 연결해야 합니다.
- 실제 이메일 발송은 Supabase Auth SMTP/메일 템플릿·Redirect URL 설정이 필요합니다.
- Storage 버킷과 정책, 실제 Render/프론트 환경변수, 운영 관리자/판매자 승인 계정은 사용자가 설정해야 합니다.
- 세금계산서·개인정보 보존·전자상거래 고지·환불/노쇼·판매자 정산 정책은 법률/세무 검토 후 운영 규칙을 확정해야 합니다.
- 다중 Render 인스턴스의 공유 rate limit, 백업/복구, 오류 추적, 부하/E2E/Supabase 로컬 RLS 테스트는 운영 인프라에 맞게 추가해야 합니다.

## 9. GitHub 보안
루트 `.gitignore`는 실제 `.env`, 키/인증서, 로컬 DB, `node_modules`, 빌드 결과, 캐시/도구 상태를 제외합니다. 커밋 전 `git status --short`, 비밀값 검색, GitHub Secret scanning/Push protection을 확인하십시오. 키가 노출되면 파일 삭제가 아니라 Supabase/외부 제공자에서 즉시 폐기·교체해야 합니다.
