/**
 * DB(Postgres RPC)나 외부 결제 제공사(Toss)가 보낸 에러 메시지를 그대로 고객에게 보여주기 전
 * 최소한의 안전장치입니다. 우리가 직접 작성한 메시지는 전부 한국어라, 한글이 아니면 우리가 쓴
 * 원본이 아니라(예상 못 한 Postgres 에러, 외부 API의 영어 메시지 등) 안전한 기본 메시지로 대체합니다.
 * 실제 원인은 error_logs에 남겨서 관리자만 볼 수 있게 하고(app.ts의 logError 호출부 참고), 이
 * 함수는 "고객에게 보여줄 문자열"만 결정합니다.
 */
const hasKorean = (text: string) => /[가-힣]/.test(text);

export function safeUserMessage(rawMessage: string | null | undefined, fallback: string): string {
  if (!rawMessage) return fallback;
  return hasKorean(rawMessage) ? rawMessage : fallback;
}
