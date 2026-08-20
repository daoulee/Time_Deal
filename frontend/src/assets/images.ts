/**
 * 로컬 상품 이미지 경로를 타입 안전한 상수로 모아 화면에서 재사용합니다.
 * 상품 카드·홈·상세 페이지가 public/images 자산을 일관되게 참조합니다.
 * 외부 URL이나 비밀값을 넣지 않고 전달본의 로컬 파일명과 맞춰야 합니다.
 */
// Do not edit manually

export const IMAGES = {
  KAKAOTALK_20260615_174637913_1: "/images/KakaoTalk_20260615_174637913.png",
} as const;

export type ImageKey = keyof typeof IMAGES;
