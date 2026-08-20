/**
 * 백엔드 Hono·TypeScript 소스와 테스트의 정적 분석 규칙을 구성합니다.
 * modules, middleware, 공통 연결 파일에서 사용하지 않는 코드와 문법 오류를 검사합니다.
 * node_modules·빌드·npm 임시 폴더는 분석 대상에서 제외해야 합니다.
 */
import js from "@eslint/js"; import globals from "globals"; import tseslint from "typescript-eslint";
export default tseslint.config({ ignores:["dist/**","node_modules/**"] }, js.configs.recommended, ...tseslint.configs.recommended, { files:["**/*.ts"], languageOptions:{ globals:{...globals.node}, parserOptions:{project:"./tsconfig.json"} }, rules:{"@typescript-eslint/no-explicit-any":"off"} });
