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

export function normalizeApiError(value: unknown): NormalizedApiError {
  if (value instanceof Error) {
    return { code: "REQUEST_ERROR", message: value.message };
  }

  if (typeof value === "string") {
    return { code: "REQUEST_ERROR", message: value };
  }

  if (isRecord(value)) {
    const nestedError = value.error;
    if (isRecord(nestedError)) {
      return {
        code: typeof nestedError.code === "string" ? nestedError.code : "REQUEST_ERROR",
        message: typeof nestedError.message === "string" ? nestedError.message : "요청 처리에 실패했습니다."
      };
    }

    return {
      code: typeof value.code === "string" ? value.code : "REQUEST_ERROR",
      message: typeof value.message === "string" ? value.message : "요청 처리에 실패했습니다."
    };
  }

  return { code: "REQUEST_ERROR", message: "요청 처리에 실패했습니다." };
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
