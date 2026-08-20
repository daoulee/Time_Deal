/**
 * frontend/backend의 수동 작성 파일을 확장자별로 집계하고 한국어 역할 헤더 주석을 자동 검사합니다.
 * TypeScript·JavaScript·스타일·SQL·YAML·환경변수 예시·robots·HTML을 감사하며 문법상 부적절한 파일은 명시적 예외로 보고합니다.
 * shebang, @ts-check/@ts-nocheck, CSS @charset처럼 먼저 와야 하는 구문 뒤의 안전한 위치까지 검사합니다.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["frontend", "backend"];
const skippedDirectoryNames = new Set(["node_modules", "dist", "build", "coverage", ".git"]);
const commentableExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".scss", ".sql", ".yaml", ".yml"]);
const specialCommentableNames = new Set([".env.example", ".gitignore", "robots.txt"]);
const explicitExceptions = new Map([
  ["frontend/src/vite-env.d.ts", "Vite가 관리하는 자동 생성 타입 참조 파일"],
]);
const generatedReportPaths = new Map([
  ["frontend/sitemap-routes.txt", "사이트맵 생성 스크립트가 만드는 자동 생성 경로 목록"],
]);
const inappropriateExtensions = new Map([
  [".json", "JSON 문법은 주석을 허용하지 않으며 package-lock/tsconfig 등 도구 입력 파일"],
  [".jpeg", "바이너리 상품 이미지"],
  [".jpg", "바이너리 이미지"],
  [".png", "바이너리 이미지"],
  [".ico", "바이너리 파비콘"],
  [".woff", "바이너리 폰트"],
  [".woff2", "바이너리 폰트"],
  [".svg", "이미지 자산이며 placeholder.svg는 외부 제공 자산"],
]);

async function walk(relativeDirectory) {
  const entries = await readdir(path.join(root, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && (skippedDirectoryNames.has(entry.name) || entry.name.startsWith(".node_modules.trash."))) continue;
    const relativePath = path.posix.join(relativeDirectory.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...await walk(relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

function extensionOf(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  return extension || "<none>";
}

function contentAfterRequiredPrefix(content) {
  let rest = content.replace(/^\uFEFF/, "");
  if (rest.startsWith("#!")) rest = rest.slice(rest.indexOf("\n") + 1);
  if (rest.startsWith("@charset")) rest = rest.slice(rest.indexOf("\n") + 1);
  if (rest.startsWith("// @ts-nocheck") || rest.startsWith("// @ts-check")) rest = rest.slice(rest.indexOf("\n") + 1);
  return rest;
}

function hasKoreanHeader(relativePath, content) {
  if (relativePath.endsWith(".html")) {
    const headStart = content.indexOf("<head>");
    if (headStart < 0) return false;
    return /<!--[\s\S]{0,600}[가-힣][\s\S]*?-->/.test(content.slice(headStart, headStart + 900));
  }
  const prepared = contentAfterRequiredPrefix(content).slice(0, 1200);
  if (relativePath.endsWith(".sql")) return /^(?:--[^\n]*[가-힣][^\n]*\n){2,8}/.test(prepared);
  if (relativePath.endsWith(".yaml") || relativePath.endsWith(".yml") || specialCommentableNames.has(path.basename(relativePath))) {
    return /^(?:#[^\n]*[가-힣][^\n]*\n){2,8}/.test(prepared);
  }
  return /^\/\*\*[\s\S]{0,1000}?[가-힣][\s\S]*?\*\//.test(prepared);
}

const allFiles = (await Promise.all(sourceRoots.map(walk))).flat().sort();
const inventory = new Map();
const targets = [];
const exceptions = [];

for (const relativePath of allFiles) {
  const extension = extensionOf(relativePath);
  inventory.set(extension, (inventory.get(extension) ?? 0) + 1);
  if (explicitExceptions.has(relativePath)) {
    exceptions.push({ path: relativePath, reason: explicitExceptions.get(relativePath) });
  } else if (generatedReportPaths.has(relativePath)) {
    exceptions.push({ path: relativePath, reason: generatedReportPaths.get(relativePath) });
  } else if (relativePath.endsWith(".html") || commentableExtensions.has(extension) || specialCommentableNames.has(path.basename(relativePath))) {
    targets.push(relativePath);
  } else if (inappropriateExtensions.has(extension)) {
    exceptions.push({ path: relativePath, reason: inappropriateExtensions.get(extension) });
  } else {
    exceptions.push({ path: relativePath, reason: "주석 감사 대상이 아닌 데이터·텍스트 또는 도구 전용 파일" });
  }
}

const failures = [];
for (const relativePath of targets) {
  const content = await readFile(path.join(root, relativePath), "utf8");
  if (!hasKoreanHeader(relativePath, content)) failures.push(relativePath);
}

const reportLines = [
  "타임딜 전체 파일 한국어 헤더 주석 감사 결과",
  `실행 시각: ${new Date().toISOString()}`,
  "",
  "[확장자별 전체 인벤토리]",
  ...[...inventory.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([extension, count]) => `${extension}: ${count}`),
  "",
  `[감사 대상] ${targets.length}`,
  `[적용 확인] ${targets.length - failures.length}`,
  `[실패] ${failures.length}`,
  `[예외] ${exceptions.length}`,
  "",
  "[명시적 예외 목록]",
  ...exceptions.map((item) => `${item.path} — ${item.reason}`),
  "",
  "[실패 목록]",
  ...(failures.length ? failures : ["없음"]),
  "",
];

const reportPath = path.join(root, "header-comment-audit-report.txt");
await writeFile(reportPath, reportLines.join("\n"), "utf8");
console.log(reportLines.join("\n"));
if (failures.length) process.exitCode = 1;
