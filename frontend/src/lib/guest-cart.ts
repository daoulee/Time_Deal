/**
 * 로그인하지 않은 방문자의 장바구니를 localStorage에 보관합니다.
 * 로그인하면 CartPage가 이 내용을 실제 cart_items API로 합치고 비웁니다.
 */
export type GuestCartItem = { productId: string; quantity: number };

const STORAGE_KEY = "td_guest_cart";

function read(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: GuestCartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 저장소 접근이 막혀 있으면 이번 방문 동안만 담기가 유지되지 않습니다.
  }
}

export function getGuestCart(): GuestCartItem[] {
  return read();
}

export function addToGuestCart(productId: string, quantity = 1) {
  const items = read();
  const existing = items.find((item) => item.productId === productId);
  if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
  else items.push({ productId, quantity: Math.min(20, quantity) });
  write(items);
}

export function updateGuestCartItem(productId: string, quantity: number) {
  write(read().map((item) => (item.productId === productId ? { ...item, quantity } : item)).filter((item) => item.quantity > 0));
}

export function removeGuestCartItem(productId: string) {
  write(read().filter((item) => item.productId !== productId));
}

export function clearGuestCart() {
  write([]);
}

export function getGuestCartCount(): number {
  return read().length;
}
