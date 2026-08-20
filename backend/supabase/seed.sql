-- 프론트 상품 화면과 일치하는 여섯 개 상품·타임딜 샘플 행을 Supabase에 입력합니다.
-- Products/Deals 조회 API가 연결 후 확인할 초기 데이터를 제공합니다.
-- schema.sql 실행 후 사용하며 충돌 시 안전한 일부 필드만 갱신합니다.
-- seller_id는 채우지 않습니다(가입 전이라 유효한 profiles.id가 없음). create_order_atomic은
-- seller_id가 있는 상품만 주문 가능하므로, 실제 주문을 테스트하려면 가입 후 아래를 한 번 실행하세요:
-- update public.products set seller_id='<판매자로 쓸 profiles.id>' where seller_id is null;
insert into public.products(id,name,description,category,image,regular_price,inventory,status) values
('eggs-30','신선한 계란 30구','지역 농가에서 당일 선별한 신선한 계란입니다.','신선식품','eggs_1.jpeg',15000,80,'active'),('strawberry-2','논산 딸기 2팩','달콤한 논산 딸기 두 팩 구성입니다.','과일','strawberries_1.jpeg',12000,60,'active'),('tissue-32','도톰한 화장지 32롤','부드럽고 도톰한 3겹 화장지입니다.','생활용품','tissue_1.jpeg',25000,100,'active'),('milk-6','서울우유 1L × 6','온 가족을 위한 우유 묶음입니다.','유제품','milk_1.jpeg',18000,50,'active'),('detergent-set','세제 + 섬유유연제','세탁 필수품 실속 세트입니다.','생활용품','detergent_1.jpeg',32000,45,'active'),('grocery-box','지역 마트 알뜰 패키지','자주 찾는 식료품을 담았습니다.','알뜰세트','grocery_1.jpeg',45000,25,'active') on conflict(id) do update set name=excluded.name;
insert into public.deals(id,product_id,deal_price,participants,target,starts_at,ends_at,status) values
('deal-eggs-30','eggs-30',9900,15,20,now(),now()+interval '30 days','active'),('deal-strawberry-2','strawberry-2',8500,8,15,now(),now()+interval '30 days','active'),('deal-tissue-32','tissue-32',16900,12,30,now(),now()+interval '30 days','active'),('deal-milk-6','milk-6',13500,5,20,now(),now()+interval '30 days','active'),('deal-detergent-set','detergent-set',21900,18,25,now(),now()+interval '30 days','active'),('deal-grocery-box','grocery-box',32000,3,10,now(),now()+interval '30 days','active') on conflict(id) do update set deal_price=excluded.deal_price;
-- 1. 상품(products) 테이블 초기 데이터 입력
insert into public.products(id, name, description, category, image, regular_price, inventory, status) values
('eggs-30', '신선한 계란 30구', '지역 농가에서 당일 선별한 신선한 계란입니다.', '신선식품', 'eggs_1.jpeg', 15000, 80, 'active'),
('strawberry-2', '논산 딸기 2팩', '달콤한 논산 딸기 두 팩 구성입니다.', '과일', 'strawberries_1.jpeg', 12000, 60, 'active'),
('tissue-32', '도톰한 화장지 32롤', '부드럽고 도톰한 3겹 화장지입니다.', '생활용품', 'tissue_1.jpeg', 25000, 100, 'active'),
('milk-6', '서울우유 1L × 6', '온 가족을 위한 우유 묶음입니다.', '유제품', 'milk_1.jpeg', 18000, 50, 'active'),
('detergent-set', '세제 + 섬유유연제', '세탁 필수품 실속 세트입니다.', '생활용품', 'detergent_1.jpeg', 32000, 45, 'active'),
('grocery-box', '지역 마트 알뜰 패키지', '자주 찾는 식료품을 담았습니다.', '알뜰세트', 'grocery_1.jpeg', 45000, 25, 'active')
on conflict(id) do update set name=excluded.name;

-- 2. 타임딜(deals) 테이블 초기 데이터 입력
insert into public.deals(id, product_id, deal_price, participants, target, starts_at, ends_at, status) values
('deal-eggs-30', 'eggs-30', 9900, 15, 20, now(), now() + interval '30 days', 'active'),
('deal-strawberry-2', 'strawberry-2', 8500, 8, 15, now(), now() + interval '30 days', 'active'),
('deal-tissue-32', 'tissue-32', 16900, 12, 30, now(), now() + interval '30 days', 'active'),
('deal-milk-6', 'milk-6', 13500, 5, 20, now(), now() + interval '30 days', 'active'),
('deal-detergent-set', 'detergent-set', 21900, 18, 25, now(), now() + interval '30 days', 'active'),
('deal-grocery-box', 'grocery-box', 32000, 3, 10, now(), now() + interval '30 days', 'active')
on conflict(id) do update set deal_price=excluded.deal_price;



