/**
 * 프론트 CSS 빌드에서 Tailwind CSS PostCSS 변환을 활성화합니다.
 * Vite가 `src/index.css`의 유틸리티와 테마 스타일을 처리할 때 사용합니다.
 * 플러그인 변경 시 Vite의 Tailwind 플러그인 설정과 함께 검증해야 합니다.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
