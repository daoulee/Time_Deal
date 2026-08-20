/**
 * 모든 백엔드 모듈이 사용하는 성공·실패 JSON 응답 형식을 제공합니다.
 * 프론트 apiFetch와 오류 정규화 코드가 `ok`, `data`, `error` 구조를 소비합니다.
 * 새 API도 동일한 형태를 유지해 화면별 예외 처리를 줄입니다.
 */
export const apiSuccess = <T>(data:T) => ({ok:true as const,data});
export const apiFailure = (code:string,message:string,details?:unknown) => ({ok:false as const,error:{code,message,...(details===undefined?{}:{details})}});
