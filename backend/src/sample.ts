/**
 * Supabase 미연결 시 Home·Products 공개 조회만 확인할 수 있게 상품·딜 샘플을 제공합니다.
 * ProductsRoutes가 `source: sample` 안내와 함께 읽기 전용으로 반환합니다.
 * 저장·수정·판매자·관리자 API에는 이 데이터를 사용하지 않습니다.
 */
export const sampleProducts=[
{id:"eggs-30",name:"신선한 계란 30구",description:"지역 농가에서 당일 선별한 신선한 계란입니다.",category:"신선식품",image:"eggs_1.jpeg",regularPrice:15000,status:"active",inventory:80},
{id:"strawberry-2",name:"논산 딸기 2팩",description:"달콤한 논산 딸기 두 팩 구성입니다.",category:"과일",image:"strawberries_1.jpeg",regularPrice:12000,status:"active",inventory:60},
{id:"tissue-32",name:"도톰한 화장지 32롤",description:"부드럽고 도톰한 3겹 화장지입니다.",category:"생활용품",image:"tissue_1.jpeg",regularPrice:25000,status:"active",inventory:100},
{id:"milk-6",name:"서울우유 1L × 6",description:"온 가족을 위한 1L 우유 여섯 개 묶음입니다.",category:"유제품",image:"milk_1.jpeg",regularPrice:18000,status:"active",inventory:50},
{id:"detergent-set",name:"세제 + 섬유유연제",description:"세탁 필수품 실속 세트입니다.",category:"생활용품",image:"detergent_1.jpeg",regularPrice:32000,status:"active",inventory:45},
{id:"grocery-box",name:"지역 마트 알뜰 패키지",description:"자주 찾는 식료품을 한 상자에 담았습니다.",category:"알뜰세트",image:"grocery_1.jpeg",regularPrice:45000,status:"active",inventory:25}];
const vals=[["deal-eggs-30","eggs-30",9900,15,20],["deal-strawberry-2","strawberry-2",8500,8,15],["deal-tissue-32","tissue-32",16900,12,30],["deal-milk-6","milk-6",13500,5,20],["deal-detergent-set","detergent-set",21900,18,25],["deal-grocery-box","grocery-box",32000,3,10]] as const;
export const sampleDeals=vals.map(([id,productId,dealPrice,participants,target])=>({id,productId,dealPrice,participants,target,progress:Math.round(participants/target*100),startsAt:"2026-07-01T00:00:00.000Z",endsAt:"2026-12-31T23:59:59.000Z",status:"active",product:sampleProducts.find(p=>p.id===productId)!}));
