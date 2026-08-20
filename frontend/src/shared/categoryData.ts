/**
 * 홈·상품 목록 헤더의 카테고리 드롭다운이 공유하는 대분류→소분류 데이터입니다.
 * 실제 상품 데이터는 대분류 수준의 category 값만 가지고 있어, 소분류 클릭은
 * 상품 페이지에서 대분류로 필터링하되 상품명에 소분류 키워드가 매칭되면 우선 좁혀 보여줍니다.
 */
export const CATEGORY_GROUPS: Record<string, string[]> = {
  "채소·과일": ["친환경", "제철과일", "국산과일", "수입과일", "간편과일", "냉동·견과일"],
  "신선식품": ["정육·가공육", "달걀·알류", "수산·해산물", "건어물", "반찬·메인요리"],
  "베이커리·델리": ["식빵·모닝빵", "베이글·식사빵", "케이크·타르트", "쿠키·스콘", "샌드위치·샐러드"],
  "간편식·밀키트": ["국·탕·찌개", "볶음·찜요리", "파스타·면류", "냉동볶음밥", "떡볶이·분식"],
  "면·양념·오일": ["라면·국수", "파스타면·소스", "오일·식초", "설탕·소금·조미료", "장류·가루"],
  "음료·우유": ["우유·두유", "생수·탄산수", "과일·채소즙", "커피·티백", "요거트·디저트"],
  "생활용품·뷰티": ["화장지·물티슈", "세탁세제·섬유유연제", "주방세제", "스킨케어", "헤어·바디케어"],
};

export type ThemeKey = "best" | "goldentime" | "closing-today" | "new" | "discount" | "morning";

export const THEME_ROUTE: Record<string, ThemeKey> = {
  "베스트": "best",
  "골든타임": "goldentime",
  "당일마감": "closing-today",
  "신규오픈": "new",
  "특가/공구": "discount",
  "모닝픽": "morning",
};

export const THEME_LABEL: Record<ThemeKey, string> = {
  best: "베스트",
  goldentime: "골든타임",
  "closing-today": "당일마감",
  new: "신규오픈",
  discount: "특가/공구",
  morning: "모닝픽",
};

export const THEME_DESCRIPTION: Record<ThemeKey, string> = {
  best: "지금 참여자가 가장 많은 인기 타임딜이에요",
  goldentime: "할인율이 높은데 마감도 얼마 안 남은 골든타임 딜이에요",
  "closing-today": "마감이 가장 임박한 순서로 모았어요",
  new: "아직 참여자가 적은, 새로 올라온 딜이에요",
  discount: "할인율이 가장 높은 특가 상품이에요",
  morning: "내일 아침 7시부터 바로 픽업할 수 있는 상품이에요",
};
