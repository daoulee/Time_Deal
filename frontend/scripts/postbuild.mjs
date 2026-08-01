/**
 * Vite 빌드가 끝난 뒤 SEO·배포용 정적 파일을 최종 정리합니다.
 * prerender와 sitemap 산출물이 배포 dist에 올바르게 포함되도록 후처리합니다.
 * 실행 전 production build가 성공하고 dist가 존재해야 합니다.
 */
import { spawnSync } from "node:child_process";

const steps = [
  ["sitemap-routes", ["node", "scripts/generate-sitemap-routes.mjs"]],
  ["prerender", ["node", "scripts/prerender.mjs"]],
];

for (const [name, command] of steps) {
  const [bin, ...args] = command;
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  if (result.status !== 0) {
    const exitCode = result.status ?? "unknown";
    console.warn(`[postbuild] ${name} skipped or failed with exit code ${exitCode}`);
    break;
  }
}
