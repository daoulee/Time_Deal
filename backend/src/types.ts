/**
 * 인증 사용자와 user·seller·admin 역할을 Hono 컨텍스트에 타입으로 연결합니다.
 * auth 미들웨어와 모든 보호 모듈이 currentUser를 같은 형태로 사용합니다.
 * 새 역할을 추가하면 SQL app_role과 권한 미들웨어도 함께 변경해야 합니다.
 */
export type AppRole="user"|"seller"|"admin"; export type CurrentUser={id:string;email:string;name:string;emailVerified:boolean;role:AppRole};
declare module "hono" { interface ContextVariableMap { currentUser:CurrentUser|null } }
