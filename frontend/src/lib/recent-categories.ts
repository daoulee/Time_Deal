/**
 * 상품 상세를 볼 때마다 카테고리를 localStorage에 최신순으로 남겨서, 로그인 없이도
 * "최근 관심 카테고리 기반 추천"에 쓸 수 있게 합니다.
 */
const STORAGE_KEY = "timedeal-recent-categories";
const MAX_ENTRIES = 20;

export function recordCategoryView(category: string) {
  if (!category) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [category, ...list.filter((item) => item !== category)].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장소 접근이 막혀 있으면 조용히 건너뜁니다.
  }
}

export function getRecentCategories(limit = 3): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return list.slice(0, limit);
  } catch {
    return [];
  }
}
