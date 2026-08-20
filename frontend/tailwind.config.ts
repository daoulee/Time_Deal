/**
 * Tailwind가 프론트 소스에서 사용할 디자인 토큰과 콘텐츠 경로를 정의합니다.
 * 오렌지 라이트·다크 테마와 UI 컴포넌트 클래스 생성을 지원합니다.
 * 빌드 시 사용하는 클래스가 누락되지 않도록 pages와 shared 경로를 포함합니다.
 */
import type { Config } from "tailwindcss";

// Compatibility shim for lovable-tagger@1.1.x.
// The app uses Tailwind v4 via CSS-first config in src/index.css.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config;
