/**
 * 홈·상품 목록·상세 화면에서 사용하는 프론트 상품 모델과 개발 전용 카탈로그 fixture입니다.
 * fixture는 VITE_ENABLE_SAMPLE_DATA=true인 개발 빌드에서만 서비스 계층이 반환합니다.
 * 운영 빌드에서는 이 데이터를 초기 상태나 장애 대체 데이터로 사용하지 않습니다.
 */
export type Product = {
  id: string;
  /** 주문 RPC가 활성 타임딜 가격을 적용할 때 사용하는 deals.id입니다. */
  dealId?: string;
  name: string;
  image: string;
  category: string;
  originalPrice: number;
  dealPrice: number;
  participants: number;
  target: number;
  endsAt: string;
  /** ISO 8601 종료 시각입니다. 운영 마감순 정렬에 사용하며 개발 fixture에서는 생략할 수 있습니다. */
  endsAtIso?: string;
};

export const PRODUCTS: Product[] = [
  { id: "eggs-30", dealId: "deal-eggs-30", name: "신선한 계란 30구", image: "/images/eggs_1.jpeg", category: "신선식품", originalPrice: 15000, dealPrice: 9900, participants: 15, target: 20, endsAt: "오늘 21:00" },
  { id: "strawberry-2", dealId: "deal-strawberry-2", name: "논산 딸기 2팩", image: "/images/strawberries_1.jpeg", category: "과일", originalPrice: 12000, dealPrice: 8500, participants: 8, target: 15, endsAt: "오늘 22:30" },
  { id: "tissue-32", dealId: "deal-tissue-32", name: "도톰한 화장지 32롤", image: "/images/tissue_1.jpeg", category: "생활용품", originalPrice: 25000, dealPrice: 16900, participants: 12, target: 30, endsAt: "내일 10:00" },
  { id: "milk-6", dealId: "deal-milk-6", name: "서울우유 1L × 6", image: "/images/milk_1.jpeg", category: "유제품", originalPrice: 18000, dealPrice: 13500, participants: 5, target: 20, endsAt: "내일 12:00" },
  { id: "detergent-set", dealId: "deal-detergent-set", name: "세제 + 섬유유연제", image: "/images/detergent_1.jpeg", category: "생활용품", originalPrice: 32000, dealPrice: 21900, participants: 18, target: 25, endsAt: "내일 18:00" },
  { id: "grocery-box", dealId: "deal-grocery-box", name: "지역 마트 알뜰 패키지", image: "/images/grocery_1.jpeg", category: "알뜰세트", originalPrice: 45000, dealPrice: 32000, participants: 3, target: 10, endsAt: "금요일 20:00" },
];

export const FEATURED_PRODUCT = PRODUCTS[0];
export const INITIAL_PARTICIPANTS = PRODUCTS.reduce((total, product) => total + product.participants, 0);
export const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;
export const progressOf = (product: Product) => Math.min(100, Math.round((product.participants / product.target) * 100));
export const discountPercentOf = (product: Product) => product.originalPrice > 0 ? Math.max(0, Math.round((1 - product.dealPrice / product.originalPrice) * 100)) : 0;
