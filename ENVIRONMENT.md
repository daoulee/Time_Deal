# 타임딜 웹 — 개발·서버 환경 정리

> 웹팀(`Web` 브랜치) 쪽 환경 설명 문서입니다. 모바일 앱(`app/`, `main` 브랜치)과는 별도 프로젝트로 개발돼 왔고, Supabase 통합을 준비하면서 이 문서를 정리했습니다.

---

## 1. 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React + Vite + TypeScript, React Router, TanStack Query(설치는 돼 있으나 아직 미사용) |
| 백엔드 | Hono(Node.js) + TypeScript |
| DB / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| 결제 | 토스페이먼츠 (현재 TEST 모드 키만 사용 — 실결제 안 됨) |
| 지도/좌표 | Google Maps JavaScript API (Geocoding 포함) |
| 소셜 로그인 | 카카오 (Supabase Auth OAuth 연동), 네이버는 UI만 있고 미완성 |
| 배포 | 백엔드: Render (Web Service) · 프론트: Netlify |

Node.js 버전: 로컬 개발 환경은 v24 기준으로 작업했습니다.

---

## 2. 저장소 구조

```text
backend/   # Hono API 서버, Supabase 마이그레이션(supabase/migrations/*.sql)
frontend/  # React/Vite 프론트엔드
```

- 백엔드 라우트: `backend/src/modules/<기능명>/<기능명>Routes.ts`
- 프론트 페이지: `frontend/src/pages/<기능명>/*.tsx`
- DB 스키마 변경 이력: `backend/supabase/migrations/` 아래 날짜순 SQL 파일 (총 15개, 가장 최근 것부터 실행 순서대로 쌓여 있음)

---

## 3. 로컬 개발 환경 실행

### 백엔드 (포트 10000)
```bash
cd backend
npm install
cp .env.example .env   # 값은 팀 내부에서 별도 전달받아야 함 (아래 4번 참고)
npm run dev
```

### 프론트엔드 (포트 3100)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev -- --port 3100
```

검사 명령 (양쪽 폴더 공통):
```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

헬스체크: 백엔드 `GET /health`(생존만 확인), `GET /ready`(Supabase 연결까지 확인).

---

## 4. 환경변수 (값이 아니라 "무엇이 필요한지"만 정리)

⚠️ **실제 키 값은 이 문서에 절대 적지 않습니다.** `.env.example` 파일에 필요한 변수 이름과 형식만 들어있고, 실제 값은 `.env`(git에 안 올라감)나 Render/Netlify 대시보드의 Secret으로만 관리합니다.

### 백엔드 (`backend/.env`)
| 변수 | 용도 |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase 프로젝트 접속 정보. service role 키는 RLS를 우회하는 최고 권한 키라 서버에만 존재해야 함 |
| `ALLOWED_ORIGINS`, `AUTH_REDIRECT_ORIGINS` | CORS·인증 리다이렉트 허용 도메인 |
| `PUBLIC_BACKEND_URL` | 백엔드 자신의 공개 URL |
| `PRODUCT_IMAGE_BUCKET`, `MAX_IMAGE_BYTES` | Supabase Storage 상품 이미지 버킷 설정 |
| `TOSS_SECRET_KEY` | 토스페이먼츠 시크릿 키 (현재 `test_sk_...` TEST 모드) |
| `NAVER_CLIENT_ID/SECRET/REDIRECT_URI` | 네이버 로그인용 자리만 있고 실제 연동은 미완성 |
| `ENABLE_SAMPLE_DATA` | 개발 중 Supabase 연결 없이 샘플 데이터로 화면만 확인할 때 사용 (운영에선 자동 비활성화) |

### 프론트엔드 (`frontend/.env`)
| 변수 | 용도 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드(Render) 주소 |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase Auth(카카오 로그인 등)용 공개 키 — 브라우저에 노출돼도 되는 키만 사용 |
| `VITE_GOOGLE_MAPS_API_KEY` | 지도 페이지용 |
| `VITE_TOSS_CLIENT_KEY` | 결제위젯용 (`test_ck_...`) |
| `VITE_ENABLE_SAMPLE_DATA` | 운영에서는 항상 `false` |

---

## 5. Supabase 구성 (현재 우리 프로젝트 기준)

- 스키마는 `backend/supabase/migrations/`의 SQL 파일을 시간순으로 실행해서 만들어져 있습니다(테이블 30개 안팎: 상품/딜/주문/결제/재고/문의/커뮤니티/리뷰/알림/경매 등 + `create_order_atomic`/`cancel_order_atomic` 같은 원자적 주문 처리 함수 포함).
- 백엔드는 `service_role` 키로만 DB에 접근하고(RLS 우회, 대신 코드 레벨에서 권한을 직접 검증), 프론트/브라우저에서는 anon 키로 Supabase Auth(로그인/회원가입/카카오 OAuth)만 직접 호출합니다 — 테이블 조회는 전부 백엔드 API를 거칩니다.
- Storage에 상품 이미지용 버킷(`product-images`)이 있고, signed upload URL 방식으로 업로드합니다.
- Authentication → URL Configuration에 프론트 도메인과 `/auth`, `/auth/reset-password` 리다이렉트가 등록돼 있어야 합니다.
- 카카오 로그인은 Supabase Dashboard의 OAuth Provider 설정과 카카오 개발자센터 양쪽에 콜백이 등록돼 있어야 동작합니다.

---

## 6. 아직 완성 안 된 부분

- **결제**: 토스페이먼츠 TEST 모드만 연동됨. 실 결제 열려면 가맹점 심사 통과 후 라이브 키로 교체 + 웹훅 서명 검증 등 추가 작업 필요.
- **네이버 로그인**: UI/라우트만 있고 실제 OAuth 연동 미완성.
- **이메일 발송**: 현재 Supabase 기본 발송 기능만 사용 중 — 발송량 제한이 있어서 별도 이메일 서비스(Resend 등) 연동을 검토 중.
- **에러 모니터링**: 자체 에러 로그 테이블 + 관리자 콘솔에서 확인 가능하도록 최근에 추가함(외부 서비스 없이 자체 구현).

---

## 7. 참고

- 프로젝트 전체 정책(주문/결제 흐름, 권한 경계 등)은 저장소 루트의 `README.md`에 더 자세히 있습니다.
- 이 저장소는 **public**입니다 — 실제 키 값은 절대 커밋하지 않도록 항상 `git status` 확인 후 커밋하세요.

---

> 작성: Claude · 2026-09-15
