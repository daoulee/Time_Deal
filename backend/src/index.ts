/**
 * Render의 PORT 또는 로컬 기본 포트에서 Hono 앱을 시작하는 서버 진입점입니다.
 * app.ts에서 조립한 fetch handler를 Node 서버에 연결합니다.
 * Render 시작 명령인 `npm start`가 빌드된 이 진입점을 실행합니다.
 */
import{serve}from"@hono/node-server";import app from"./app.js";import{config}from"./config.js";serve({fetch:app.fetch,port:config.port},info=>console.log(`타임딜 백엔드가 ${info.port} 포트에서 실행 중입니다.`));
