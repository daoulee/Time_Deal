/**
 * 토스페이먼츠 결제위젯 SDK를 초기화하는 공용 유틸리티입니다.
 * TossCheckoutPage가 결제 UI를 렌더링하기 전에 이 함수로 SDK 로드를 기다립니다.
 * 클라이언트 키 미설정 시 네트워크 요청 없이 명시적으로 실패해 화면이 조용히 깨지지 않게 합니다.
 */
import { loadTossPayments, type TossPaymentsSDK } from "@tosspayments/tosspayments-sdk";
import { publicKeys } from "@/config/public-keys";

export const isTossPaymentsConfigured = Boolean(publicKeys.tossClientKey);

let sdkPromise: Promise<TossPaymentsSDK> | null = null;

export function loadTossPaymentsSdk(): Promise<TossPaymentsSDK> {
  if (!isTossPaymentsConfigured) return Promise.reject(new Error("프론트 Toss 클라이언트 키(VITE_TOSS_CLIENT_KEY)가 설정되지 않았습니다."));
  if (!sdkPromise) sdkPromise = loadTossPayments(publicKeys.tossClientKey);
  return sdkPromise;
}
