/**
 * Tailwind 클래스 조건 결합과 충돌 해결을 위한 공통 유틸리티를 제공합니다.
 * UI 컴포넌트가 cn 함수를 사용해 기본 클래스와 사용자 클래스를 병합합니다.
 * 스타일 우선순위를 보존하도록 clsx와 tailwind-merge를 함께 사용합니다.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
