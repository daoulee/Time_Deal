import '../models/deal.dart';

final mockDeals = [
  Deal(
    id: 'mock_1', storeId: 's1',
    storeName: '성수 베이커리', storeCategory: '베이커리',
    title: '오늘의 마감 식빵 세트', description: '당일 생산 식빵 + 크루아상 3개 세트. 내일은 없어요!',
    originalPrice: 12000, discountedPrice: 5000,
    totalStock: 10, remainingStock: 3,
    expiresAt: DateTime.now().add(const Duration(minutes: 25)),
    distanceKm: 0.3,
    iconName: 'wheat',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop&auto=format&q=80',
  ),
  Deal(
    id: 'mock_2', storeId: 's2',
    storeName: '할머니 분식', storeCategory: '음식',
    title: '떡볶이 + 순대 마감 세트', description: '오늘 장사 마감! 남은 재료 전부 털어드려요.',
    originalPrice: 9000, discountedPrice: 4000,
    totalStock: 5, remainingStock: 2,
    expiresAt: DateTime.now().add(const Duration(minutes: 45)),
    distanceKm: 0.7,
    iconName: 'utensils',
    imageUrl: 'https://images.unsplash.com/photo-1635363638580-c2809d049eee?w=400&h=400&fit=crop&auto=format&q=80',
  ),
  Deal(
    id: 'mock_3', storeId: 's3',
    storeName: '카페 모카', storeCategory: '카페',
    title: '아이스 아메리카노 2잔', description: '마감 1시간 전 특가! 원두 소진 시까지.',
    originalPrice: 8000, discountedPrice: 3500,
    totalStock: 20, remainingStock: 11,
    expiresAt: DateTime.now().add(const Duration(hours: 1)),
    distanceKm: 0.5,
    iconName: 'coffee',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop&auto=format&q=80',
  ),
  Deal(
    id: 'mock_4', storeId: 's4',
    storeName: '동네 마트', storeCategory: '마트',
    title: '유통기한 임박 샐러드 묶음', description: '내일이 유통기한! 건강하게 드세요.',
    originalPrice: 6500, discountedPrice: 2000,
    totalStock: 8, remainingStock: 5,
    expiresAt: DateTime.now().add(const Duration(hours: 2)),
    distanceKm: 1.1,
    iconName: 'shoppingCart',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&auto=format&q=80',
  ),
  Deal(
    id: 'mock_5', storeId: 's5',
    storeName: '꽃향기 플라워', storeCategory: '꽃집',
    title: '오늘의 마감 꽃다발', description: '오늘 들어온 꽃 마지막 묶음. 싱싱해요!',
    originalPrice: 15000, discountedPrice: 7000,
    totalStock: 4, remainingStock: 1,
    expiresAt: DateTime.now().add(const Duration(minutes: 15)),
    distanceKm: 0.9,
    iconName: 'flower2',
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop&auto=format&q=80',
  ),
];

const dealCategories = ['전체', '베이커리', '음식', '카페', '마트', '꽃집'];

const dealCenter = (lat: 37.5444, lng: 127.0557);

const neighborhoodCoords = <String, ({double lat, double lng})>{
  '성수동 1가': (lat: 37.5453, lng: 127.0554),
  '성수동 2가': (lat: 37.5444, lng: 127.0557),
  '뚝섬로':    (lat: 37.5468, lng: 127.0514),
  '서울숲길':  (lat: 37.5445, lng: 127.0442),
  '왕십리':    (lat: 37.5614, lng: 127.0377),
  '마장동':    (lat: 37.5584, lng: 127.0462),
  '행당동':    (lat: 37.5567, lng: 127.0386),
  '사근동':    (lat: 37.5576, lng: 127.0441),
};

const dealCoordinates = <String, ({double lat, double lng})>{
  'mock_1': (lat: 37.5447, lng: 127.0538),
  'mock_2': (lat: 37.5431, lng: 127.0598),
  'mock_3': (lat: 37.5460, lng: 127.0570),
  'mock_4': (lat: 37.5415, lng: 127.0618),
  'mock_5': (lat: 37.5478, lng: 127.0492),
  '1':      (lat: 37.5447, lng: 127.0538),
  '2':      (lat: 37.5431, lng: 127.0598),
  '3':      (lat: 37.5460, lng: 127.0570),
  '4':      (lat: 37.5415, lng: 127.0618),
  '5':      (lat: 37.5478, lng: 127.0492),
};
