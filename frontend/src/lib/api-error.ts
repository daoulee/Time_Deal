/**
 * 백엔드 성공·실패 응답을 안전하게 읽고 사용자용 오류 메시지로 정규화합니다.
 * 인증·문의 등 pages의 apiFetch 결과 처리에서 공통으로 사용합니다.
 * JSON이 아닌 오류 응답도 예외 없이 다룰 수 있어야 합니다.
 */
import { toast } from "sonner";

export type NormalizedApiError = {
  code: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

// 백엔드는 항상 한국어 메시지만 내려주도록 짜여 있습니다. 한글이 아닌 메시지가 왔다면 예상 못 한
// 원본 에러(네트워크 예외, 아직 못 막은 백엔드 누락 등)일 가능성이 높아 안전한 기본 메시지로 대체합니다.
const hasKorean = (text: string) => /[가-힣]/.test(text);
const DEFAULT_MESSAGE = "요청 처리에 실패했습니다.";
const safe = (message: string) => hasKorean(message) ? message : DEFAULT_MESSAGE;

export function normalizeApiError(value: unknown): NormalizedApiError {
  if (value instanceof Error) {
    return { code: "REQUEST_ERROR", message: safe(value.message) };
  }

  if (typeof value === "string") {
    return { code: "REQUEST_ERROR", message: safe(value) };
  }

  if (isRecord(value)) {
    const nestedError = value.error;
    if (isRecord(nestedError)) {
      return {
        code: typeof nestedError.code === "string" ? nestedError.code : "REQUEST_ERROR",
        message: typeof nestedError.message === "string" ? safe(nestedError.message) : DEFAULT_MESSAGE
      };
    }

    return {
      code: typeof value.code === "string" ? value.code : "REQUEST_ERROR",
      message: typeof value.message === "string" ? safe(value.message) : DEFAULT_MESSAGE
    };
  }

  return { code: "REQUEST_ERROR", message: DEFAULT_MESSAGE };
}

export async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function notifyApiError(response: Response, fallbackMessage = "요청 처리에 실패했습니다.") {
  const body = await response.clone().text();
  const parsedBody = body
    ? (() => {
        try {
          return JSON.parse(body) as unknown;
        } catch {
          return body;
        }
      })()
    : { message: fallbackMessage };
  const error = normalizeApiError(parsedBody);

  toast.error(error.message, {
    description: error.code
  });
}
