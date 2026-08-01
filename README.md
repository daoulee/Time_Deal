# 타임딜 분리형 풀스택 소스

최신 오렌지 라이트·다크 디자인과 고객·판매자·관리자 화면을 유지하면서 **백엔드와 프론트엔드를 완전히 독립 프로젝트로 분리**했습니다. 실제 주소와 키는 포함하지 않았습니다.

```text
timedeal_fullstack_web_separated/
├── backend/   # Hono + TypeScript + Supabase, Render 독립 배포
│   └── src/modules/
│       ├── Auth/       # 인증·세션·비밀번호 찾기
│       ├── Products/   # 상품·타임딜 공개 조회(Home도 이 API 조합)
│       ├── MyPage/     # 참여·리뷰·내 프로필
│       ├── Inquiry/    # 고객·판매자 문의
│       ├── Community/  # 게시글 조회·작성
│       ├── Seller/     # 판매자 상품·대시보드
│       └── Admin/      # 관리자 통계·자료조사·사용자
├── frontend/  # React + Vite, 정적 호스팅 독립 배포
│   └── src/pages/
│       ├── Home/HomePage.tsx
│       ├── Auth/AuthPage.tsx
│       ├── Products/{ProductsPage,ProductDetailPage}.tsx
│       ├── Community/CommunityPage.tsx
│       ├── Inquiry/InquiryPage.tsx
│       ├── MyPage/MyPage.tsx
│       ├── Seller/SellerPage.tsx
│       ├── Admin/AdminPage.tsx
│       └── NotFound/NotFoundPage.tsx
└── README.md  # 이 파일 하나에 모든 연결 절차 수록
```

프론트 화면은 `src/pages/<기능명>/`을 열면 페이지 TSX가 바로 보이도록 구성했고, 기능 전용 보조 컴포넌트만 같은 폴더의 `components/`에 둡니다. 백엔드는 대응하는 기능 이름의 `src/modules/<기능명>/`에서 Routes 파일을 바로 찾을 수 있습니다. **Home은 별도 저장 기능이 아니라 Products 모듈의 상품(`/catalog`)과 Deals(`/deals`) 공개 API를 조합해 표시합니다.**

## 1. Supabase 준비
1. Supabase 프로젝트를 만들고 SQL Editor에서 `backend/supabase/schema.sql`, 그다음 `backend/supabase/seed.sql`을 실행합니다.
2. Authentication → URL Configuration에서 프론트 주소를 Site URL/Redirect URLs에 등록합니다.
3. Project Settings → API에서 Project URL, anon key, service role key를 확인합니다.
4. **service role key는 RLS를 우회하는 서버 최고 권한 키이므로 `backend`의 Render Secret에만 넣고, `frontend`, Git, 문서, 화면에 넣지 않습니다.**
5. 첫 관리자/판매자 계정은 가입 후 SQL Editor에서 `update public.profiles set role='admin' where id='사용자 UUID';` 또는 `role='seller'`로 변경합니다.

## 2. 백엔드 로컬 실행
```bash
cd backend
npm install
cp .env.example .env
# .env에 Supabase 값 입력
npm run dev
```
기본 주소는 `http://localhost:10000`, 상태 확인은 `GET /health`입니다. 점검 명령은 `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`입니다.

### 백엔드 환경변수
- `PORT`: Render가 주입하는 포트(로컬 기본 10000)
- `ALLOWED_ORIGINS`: 쉼표로 구분한 프론트 주소. 예: `http://localhost:3100,https://YOUR-FRONTEND.example`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: Supabase 프로젝트 값
- `SUPABASE_SERVICE_ROLE_KEY`: **서버 전용 Secret**
- `PUBLIC_BACKEND_URL`: Render 백엔드 공개 주소

### 샘플 폴백 주의
Supabase 키가 없을 때 `GET /api/catalog`, `GET /api/deals`만 화면 확인용 샘플을 반환하며 응답에 `source: "sample"`과 “운영 데이터가 아님” 안내가 붙습니다. 로그인, 저장, 수정, 판매자, 관리자 기능은 503/401/403으로 실패하며 운영 기능처럼 동작하지 않습니다.

## 3. Render 백엔드 배포
저장소 루트에 이 디렉터리를 올린 경우 `backend/render.yaml`의 Blueprint를 사용하거나 Web Service를 수동 생성합니다.
- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`
- 환경변수: 위 백엔드 환경변수를 Render Dashboard에 입력

`backend/render.yaml`을 저장소 루트 Blueprint로 직접 쓰면 `rootDir: backend`가 적용됩니다. backend 폴더만 별도 저장소로 올리면 `rootDir` 줄을 제거하세요.

## 4. 프론트 로컬 실행
```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:10000
npm run dev
```
검증은 `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`입니다. 모든 비즈니스 요청은 `src/lib/api.ts`의 `apiFetch`를 통과하고, 주소는 `VITE_API_BASE_URL` 하나만 사용합니다.

## 5. 프론트 배포 연결
프론트 호스팅 환경변수에 다음만 입력하고 다시 빌드합니다.
```env
VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com
```
그 다음 Render 백엔드 `ALLOWED_ORIGINS`에 실제 프론트 주소를 추가합니다. `VITE_*` 값은 브라우저에 공개되므로 서비스 역할 키를 절대 넣지 않습니다.

## 주요 API
- 공개: `GET /health`, `GET /api/catalog`, `GET /api/catalog/:id`, `GET /api/deals`, `GET /api/deals/:id`, `GET /api/community`
- 인증: `POST /api/auth/sign-up`, `sign-in`, `sign-out`, `forgot-password`, `GET /api/auth/session`
- 고객 보호: `/api/participations`, `/api/inquiries`, `/api/reviews`, `/api/me/profile`
- 커뮤니티 쓰기: `POST /api/community`
- 판매자: `/api/seller-products`, `/api/seller-dashboard` (`seller` 또는 `admin`)
- 관리자: `/api/admin-dashboard`, `/api/admin-research`, `/api/admin-users` (`admin`)

## 보안 경계
프론트는 Supabase 키를 직접 사용하지 않습니다. 백엔드는 Bearer access token을 Supabase Auth로 검증하고 `profiles.role`을 다시 조회해 판매자·관리자 권한을 결정합니다. 데이터 쓰기는 인증/역할 미들웨어 이후 service role 클라이언트로 수행합니다. CORS는 `ALLOWED_ORIGINS`의 명시적 주소만 허용합니다.

## 코드 파일 한국어 헤더 주석
직접 관리하는 frontend/backend의 TypeScript, TSX, JavaScript, MJS/CJS, CSS/SCSS, SQL, YAML/YML, 환경변수 예시, Git 제외 규칙과 robots 파일에는 담당 기능·소비처·주의사항을 설명하는 맞춤형 한국어 헤더를 적용했습니다. HTML은 `<!DOCTYPE html>`을 첫 줄에 유지해야 하므로 `<head>` 내부 첫 안전 위치에 설명 주석을 넣었습니다. `scripts/audit-header-comments.mjs`를 저장소 루트에서 실행하면 확장자별 전체 인벤토리와 감사 결과가 `header-comment-audit-report.txt`로 생성됩니다.

주석을 넣지 않는 예외 기준은 다음과 같습니다.
- `.json`, `package-lock.json`, `tsconfig*.json`: JSON 문법이 주석을 허용하지 않고 npm·TypeScript 도구가 직접 읽는 설정/자동 생성 파일
- `frontend/src/vite-env.d.ts`: Vite가 관리하는 자동 생성 타입 참조 파일
- `frontend/sitemap-routes.txt`: 빌드 스크립트가 생성하는 공개 경로 목록
- 이미지·아이콘·폰트: 바이너리 자산이거나 소스 주석을 넣는 것이 부적절한 파일
- `placeholder.svg`: 외부 제공 이미지 자산으로 vendor 성격을 유지
- 실제 `.env`, `node_modules`, `dist`, `build`, `.git`: 애초에 Git·ZIP·감사 대상에서 제외

## GitHub 공유 보안
- 저장소에는 루트 `.gitignore`와 `.gitattributes`가 포함되어 있습니다. 실제 `.env`, 로컬 DB, 인증서·개인키, 의존성, 빌드·테스트 산출물, 캐시 및 Supabase/Render 로컬 상태 파일은 커밋 대상에서 제외됩니다.
- `backend/.env.example`과 `frontend/.env.example`은 입력 형식만 보여주는 placeholder이므로 추적해도 됩니다. 실제 값을 입력한 `.env`, `.env.local`, `.env.production` 등은 커밋하지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 GitHub Secrets에도 배포 자동화가 꼭 필요한 경우에만 넣고, 코드·Issue·PR·스크린샷에는 절대 게시하지 않습니다. 프론트 환경변수나 `VITE_*`에도 넣지 않습니다.
- 커밋 전 `git status --short`와 `git diff --cached`를 확인하고, 가능하면 GitHub 저장소의 Secret scanning 및 Push protection을 활성화하세요.
- 실수로 실제 키를 커밋했다면 파일 삭제만으로 해결되지 않습니다. 즉시 Supabase에서 해당 키를 폐기·교체하고 Git 기록에서도 제거해야 합니다.
