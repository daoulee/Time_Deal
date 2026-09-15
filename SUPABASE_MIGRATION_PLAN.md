# Supabase 통합 계획 — 웹 앱을 모바일팀 프로젝트로 이전

> 이 문서는 기존 [`WebIntegrationGuide.md`](./WebIntegrationGuide.md)를 대체합니다. 그 문서는 "동네 딜" 기능만 anon 키로 읽기 전용 연동하는 가벼운 방식이었는데, 그 기능 자체를 웹에서 뺐기 때문에 더 이상 유효하지 않습니다. **대신 웹 앱 전체(상품·주문·결제·회원 등)를 모바일팀 Supabase 프로젝트로 통째로 옮기는 걸로 방향을 바꿨습니다.**

---

## 1. 왜 바꿨나

- 예전 방식(`WebIntegrationGuide.md`)은 "동네 딜" 하나만 따로 읽어오는 방식이었는데, 두 앱을 따로 운영하면서 부분적으로만 연동하는 게 비효율적이라고 판단했습니다.
- 지금은 웹 쪽에 아직 실제 사용자가 없어서, 백엔드를 통째로 옮기기 좋은 타이밍입니다.

## 2. 무엇을 옮기나

웹 앱이 쓰는 Supabase 테이블·함수 전체입니다 (대략):

- 상품/딜: `products`, `deals`
- 주문/결제: `orders`, `order_items`, `fulfillment_groups`, `payments`, `participations`
- 재고: `inventory_movements`
- 회원: `profiles`, `seller_applications`
- 장바구니/찜/리뷰/알림: `cart_items`, `wishlist_items`, `reviews`, `notifications`
- 커뮤니티/문의: `community_posts`, `community_comments`, `community_reactions`, `community_reports`, `inquiries`, `inquiry_messages`
- 픽업/재입고/재오픈: `pickup_locations`, `pickup_slots`, `restock_requests`, `reopen_requests`
- 운영: `audit_logs`, `error_logs`, `search_terms`
- 경매(현재 화면엔 없지만 보존 중): `auction_items`, `auction_bids`, `auction_orders`, `auction_penalties`, `auction_settlements`
- 함수: `create_order_atomic`, `cancel_order_atomic`, `deal_effective_price` (주문 생성·취소를 재고/픽업 슬롯과 함께 원자적으로 처리)

## 3. 이름 충돌을 어떻게 푸나

모바일팀 프로젝트엔 이미 자체적인 `deals`, `reservations`, `wishlists` 테이블이 있습니다(구조가 다름). 충돌을 피하려고:

- **웹 쪽 테이블은 전부 `td_` 접두어를 붙여서 새로 만듭니다** (`td_products`, `td_deals`, `td_orders`...).
- 모바일팀 기존 테이블은 그대로 둡니다 — **모바일 앱 코드는 전혀 수정할 필요 없습니다.**
- 웹 백엔드 코드 안의 테이블 참조(`products` → `td_products` 등)는 전부 웹팀(Claude)이 수정합니다.

## 4. 모바일팀(친구)이 해줘야 하는 것

딱 하나입니다 — **Supabase 프로젝트 service role 키** (Project Settings → API → `service_role`).

⚠️ 카카오톡 등 메신저로 평문 전달은 피해주세요. `.env` 파일로 직접 전달하거나, 안전한 채널로 전달해주세요. 작업이 끝나면 키를 재발급(rotate)해서 예전 값은 무효화할 예정입니다.

**`.env`가 안전한 이유(와 한계)** — 이 저장소의 `.gitignore`는 `.env`/`.env.*`를 전부 제외하도록 설정돼 있고, 실제로 로컬 `.env` 파일들이 git에서 무시되는 것도 확인했습니다. 그래서 **이번에 겪었던 사고(진짜 키가 GitHub에 커밋되는 것)는 `.env`를 쓰면 재발하지 않습니다.** 다만 `.env`는 로컬 디스크의 평문 파일이라, 기기 자체가 악성코드에 감염되거나 프로젝트 폴더를 통째로 압축해서 다른 곳에 보내는 등의 상황까지 막아주진 않습니다 — "GitHub 유출"이라는 이번 사고 유형에 한해서 안전하다는 의미입니다.

그 외 계정 생성, 코드 수정, 스키마 작업은 전부 웹팀 쪽에서 처리합니다.

## 5. 웹팀(Claude)이 할 것

1. `td_` 접두어를 붙인 전체 스키마 SQL 작성 (테이블·함수·인덱스)
2. 모바일팀 프로젝트에 스키마 실행
3. 백엔드 코드의 테이블 참조를 전부 `td_` 접두어로 수정
4. 프론트엔드 `.env`(Supabase URL/Anon Key)를 모바일팀 프로젝트로 교체
5. 회원가입·로그인·주문·결제 등 핵심 플로우 실제 테스트
6. Storage 버킷(상품 이미지) 새로 생성

## 6. 회원 계정

지금 웹 쪽에 실사용자가 없고, 모바일팀 쪽 기존 가입자와도 서로 신경 쓸 필요 없다고 확인했습니다. 그래서 계정 마이그레이션(비밀번호 이전 등)은 고려하지 않고, 새 프로젝트에서 새로 시작합니다.

## 7. 순서

1. ~~친구분이 service role 키 전달~~ (대기 중)
2. Claude가 스키마 SQL 작성 → 친구분 프로젝트 SQL Editor에서 실행 (또는 Claude가 직접 실행)
3. 백엔드/프론트 코드·환경변수 수정
4. 로컬에서 전체 기능 테스트
5. Render/Netlify 배포 환경변수 교체 → 재배포

---

> 작성: Claude · 2026-09-15
