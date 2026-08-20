/**
 * React 프론트엔드의 개발 서버·빌드 플러그인·경로 별칭을 설정합니다.
 * `@` 별칭과 라우터 메시지 프록시를 앱·테스트·prerender가 동일하게 사용합니다.
 * 로컬 개발 포트는 3100이며 API 주소는 별도 환경변수에서 읽습니다.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-oxc";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  server: { host: "0.0.0.0", port: 3100 },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-router-dom": path.resolve(__dirname, "./src/lib/react-router-dom-proxy.tsx"),
      "react-router-dom-original": "react-router-dom"
    }
  },
  define: { __ROUTE_MESSAGING_ENABLED__: JSON.stringify(false) }
});
