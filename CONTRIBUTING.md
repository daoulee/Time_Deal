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
