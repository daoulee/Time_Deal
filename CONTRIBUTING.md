# 우리 동네 타임딜 — 개발 가이드

## 팀 역할 분담

| 담당 | 폴더 | 기술 스택 |
|------|------|-----------|
| 최다울 (팀장) | `app/` | Flutter (Dart) |
| 웹 담당 팀원 | `presentation/` | React + Vite + Tailwind CSS |

---

## 디렉토리 구조

```
Time_Deal/
├── app/                  ← Flutter 앱 (최다울 담당)
│   ├── lib/              ← Dart 소스코드
│   ├── android/
│   ├── ios/
│   └── pubspec.yaml
├── presentation/         ← 발표 사이트 (웹 팀원 담당)
│   ├── src/
│   │   ├── App.tsx       ← 7섹션 메인 페이지
│   │   ├── components/   ← TimeDealCard, StockGaugeBar
│   │   ├── data/         ← mockDeals.ts (목업 데이터)
│   │   └── hooks/        ← useCountdown, usePresentation
│   └── package.json
└── README.md
```

---

## 실행 방법

### Flutter 앱
```bash
cd app
flutter pub get
flutter run
```

### 발표 사이트
```bash
cd presentation
npm install
npm run dev
# → http://localhost:5173
```

---

## 주의사항

### 공통
- `main` 브랜치에 직접 푸시 금지 — PR로 머지할 것
- 커밋 메시지 형식: `feat:`, `fix:`, `docs:`, `style:` 접두사 사용
- 서로 담당 폴더 외 수정 시 반드시 팀장에게 먼저 공유

### AI 도구로 `.md` 파일 수정 시
- Claude, Kiro 등 AI로 `.md` 파일을 수정하면, 파일 맨 끝에 마지막 수정자를 남길 것:
  `> Last edited by: {AI 이름} ({날짜})`
- 여러 AI가 같은 문서를 오갈 때 누가 마지막으로 손댔는지 바로 파악하기 위함

### AI 도구로 코드 파일 수정 시 (절대 수칙)
- 코드를 수정하면, 수정한 블록 마지막 줄 근처에 각 언어의 주석 문법으로 아래 형식을 남길 것:
  `// [{AI 이름} | {날짜}] 수정범위: {함수명/범위} — {요약}`
  (Dart/Swift/JS는 `//`, Python은 `#`, HTML/XML은 `<!-- -->` 등 언어에 맞게)
- 여러 AI(Claude, Kiro 등)가 같은 코드를 오가므로, 어느 범위를 누가 마지막으로 건드렸는지 코드만 보고 바로 추적하기 위함
- 예시:
  ```dart
  // [Claude | 2026-08-21] 수정범위: _RegionStep 구글맵 미니맵 위젯 — API 키 교체 후 스타일 정리
  ```
  ```dart
  // [Kiro | 2026-08-21] 수정범위: reservation_provider.cancel() — 재고 복구 atomic RPC로 교체
  ```
  ```dart
  // [Antigravity | 2026-08-21] 수정범위: auth_feedback — 로그인 하단 토스트 및 햅틱 오렌지 체크 모달 구현
  ```

### AI 간 작업 인수인계
- Claude, agy, Kiro는 서로 직접 메시지를 주고받을 수 없음 — 레포 루트의 `Communicate.md`에 각자 자기 섹션에 글을 남기고, 작업 시작 전 다른 사람 섹션을 먼저 읽을 것
- 완료된 요청 항목엔 `[완료]` 표시

### Flutter 앱 (`app/`)
- Dart SDK: `^3.11.4`
- `flutter pub get` 후 작업 시작
- `build/` 폴더는 커밋하지 않음 (`.gitignore` 처리됨)
- 상태관리 방식 결정 전 팀장과 협의

### 발표 사이트 (`presentation/`)
- Node.js 18+ 필요
- `node_modules/` 커밋 금지 (`.gitignore` 처리됨)
- 배경색 `#0a0a0b`, 글라스 패널 `rgba(23,25,29,0.7)` — 디자인 통일 유지
- 폰트/색상 등 전역 스타일은 `src/index.css` 에서 관리

---

## 팀 정보

- **팀명**: 연리 (連理)
- **팀장**: 최다울 (202230136)
- **팀원**: 엄태훈 (202230119), 이동교 (202230134)
- **대회**: 2026 교내 캡스톤 해커톤 (8/20~22)

---
> 📝 **마지막 수정:** 2026-08-21 | **수정자:** Antigravity (Gemini 3.7 Flash) — AI 코드 주석 및 메타데이터 규칙 동기화

> Last edited by: Claude (2026-08-21) — Communicate.md 신설 안내 추가
