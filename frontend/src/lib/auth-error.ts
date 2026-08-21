/**
 * 프론트에서 Supabase Auth SDK를 직접 호출하는 지점(비밀번호 재설정, 소셜 로그인 시작)에서
 * 영어 원문 에러 메시지가 그대로 노출되지 않도록 한글로 변환하는 안전망입니다.
 * 백엔드를 거치는 일반 API 오류는 서버가 이미 한글로 내려주므로 이 함수는 보조적으로만 씁니다.
 */
const RULES: Array<{ test: RegExp; message: string | ((match: RegExpMatchArray) => string) }> = [
  { test: /invalid login credentials/i, message: "이메일 또는 비밀번호가 올바르지 않습니다." },
  { test: /email not confirmed/i, message: "이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인해 주세요." },
  { test: /user already registered|already registered/i, message: "이미 가입된 이메일입니다." },
  { test: /password should be at least (\d+) characters?/i, message: (m) => `비밀번호는 최소 ${m[1]}자 이상이어야 합니다.` },
  { test: /new password should be different from the old password/i, message: "새 비밀번호는 기존 비밀번호와 달라야 합니다." },
  { test: /token has expired or is invalid/i, message: "인증 코드가 만료되었거나 올바르지 않습니다. 다시 요청해 주세요." },
  { test: /email rate limit exceeded/i, message: "이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요." },
  { test: /for security purposes.*after (\d+) seconds?/i, message: (m) => `보안을 위해 ${m[1]}초 후 다시 시도해 주세요.` },
  { test: /rate limit/i, message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
  { test: /unable to validate email address/i, message: "이메일 형식이 올바르지 않습니다." },
  { test: /user not found/i, message: "가입되지 않은 이메일입니다." },
  { test: /session.*(missing|not found)|no session/i, message: "로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요." },
  { test: /network|fetch failed|failed to fetch/i, message: "네트워크 연결을 확인해 주세요." },
];

function hasKorean(text: string) {
  return /[가-힣]/.test(text);
}

export function translateAuthErrorMessage(message: string | null | undefined, fallback: string): string {
  if (!message) return fallback;
  for (const rule of RULES) {
    const match = message.match(rule.test);
    if (match) return typeof rule.message === "function" ? rule.message(match) : rule.message;
  }
  return hasKorean(message) ? message : fallback;
}
