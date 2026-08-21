// [Antigravity | 2026-08-21] 수정범위: mock_data.dart — 사용자 현재 GPS 및 동네 기반 동적 데모 딜 생성 및 오프셋 좌표 지원
import '../models/deal.dart';

const dealCategories = ['전체', '베이커리', '음식', '카페', '마트', '꽃집'];

const dealCenter = (lat: 37.4025, lng: 126.9463); // 기본 좌표 (안양시 비산동)

const neighborhoodCoords = <String, ({double lat, double lng})>{
  '비산동':    (lat: 37.4025, lng: 126.9463),
  '비산1동':   (lat: 37.4080, lng: 126.9410),
  '비산2동':   (lat: 37.3990, lng: 126.9450),
  '비산3동':   (lat: 37.4050, lng: 126.9530),
  '안양동':    (lat: 37.3943, lng: 126.9248),
  '평촌동':    (lat: 37.3930, lng: 126.9650),
  '관양동':    (lat: 37.4010, lng: 126.9630),
  '성수동 1가': (lat: 37.5453, lng: 127.0554),
  '성수동 2가': (lat: 37.5444, lng: 127.0557),
};

const mockDealOffsets = <String, ({double latOffset, double lngOffset})>{
  'mock_1': (latOffset: 0.0022, lngOffset: 0.0018),   // ~250m 북동
  'mock_2': (latOffset: -0.0035, lngOffset: 0.0042),  // ~500m 남동
  'mock_3': (latOffset: 0.0015, lngOffset: -0.0028),  // ~350m 북서
  'mock_4': (latOffset: -0.0048, lngOffset: -0.0039), // ~700m 남서
  'mock_5': (latOffset: 0.0038, lngOffset: -0.0015),  // ~450m 북
};

List<Deal> generateMockDeals(double centerLat, double centerLng, String neighborhood) {
  final cleanName = neighborhood.replaceAll(RegExp(r'(\d+가|\d+동|\s.*)'), '').trim();
  final prefix = cleanName.isEmpty ? '우리동네' : cleanName;

  return [
    Deal(
      id: 'mock_1',
      storeId: 's1',
      storeName: '$prefix 베이커리',
      storeCategory: '베이커리',
      title: '오늘의 마감 식빵 + 크루아상 세트',
      description: '당일 생산 식빵 + 크루아상 3개 세트. 오늘 마감 전 한정 특가!',
      originalPrice: 12000,
      discountedPrice: 5000,
      totalStock: 10,
      remainingStock: 3,
      expiresAt: DateTime.now().add(const Duration(minutes: 25)),
      distanceKm: 0.3,
      iconName: 'wheat',
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop&auto=format&q=80',
    ),
    Deal(
      id: 'mock_2',
      storeId: 's2',
      storeName: '$prefix 할머니 분식',
      storeCategory: '음식',
      title: '떡볶이 + 찰순대 마감 세트',
      description: '오늘 장사 마감! 남은 떡볶이와 순대 듬뿍 담아드려요.',
      originalPrice: 9000,
      discountedPrice: 4000,
      totalStock: 5,
      remainingStock: 2,
      expiresAt: DateTime.now().add(const Duration(minutes: 45)),
      distanceKm: 0.5,
      iconName: 'utensils',
      imageUrl: 'https://images.unsplash.com/photo-1635363638580-c2809d049eee?w=400&h=400&fit=crop&auto=format&q=80',
    ),
    Deal(
      id: 'mock_3',
      storeId: 's3',
      storeName: '카페 모카 $prefix점',
      storeCategory: '카페',
      title: '아이스 아메리카노 2잔 + 디저트',
      description: '마감 1시간 전 깜짝 특가! 원두 소진 시 조기 마감.',
      originalPrice: 11000,
      discountedPrice: 5000,
      totalStock: 15,
      remainingStock: 8,
      expiresAt: DateTime.now().add(const Duration(hours: 1)),
      distanceKm: 0.4,
      iconName: 'coffee',
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop&auto=format&q=80',
    ),
    Deal(
      id: 'mock_4',
      storeId: 's4',
      storeName: '$prefix 신선 할인마트',
      storeCategory: '마트',
      title: '유통기한 임박 샐러드 & 과일팩',
      description: '신선 야채샐러드 2팩 + 컷팅 과일 세트 할인!',
      originalPrice: 7500,
      discountedPrice: 2500,
      totalStock: 8,
      remainingStock: 4,
      expiresAt: DateTime.now().add(const Duration(hours: 2)),
      distanceKm: 0.7,
      iconName: 'shoppingCart',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&auto=format&q=80',
    ),
    Deal(
      id: 'mock_5',
      storeId: 's5',
      storeName: '꽃향기 플라워 $prefix점',
      storeCategory: '꽃집',
      title: '오늘의 마감 미니 생화 꽃다발',
      description: '오늘 들어온 싱싱한 생화 마지막 특가 묶음.',
      originalPrice: 15000,
      discountedPrice: 6500,
      totalStock: 4,
      remainingStock: 1,
      expiresAt: DateTime.now().add(const Duration(minutes: 15)),
      distanceKm: 0.45,
      iconName: 'flower2',
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop&auto=format&q=80',
    ),
  ];
}

// 콜드스타트 시 실제 GPS/동네가 확인되기 전 임시 표시용 — 특정 동 이름 대신 '우리동네'로 중립 표시
// (generateMockDeals()가 빈 문자열이면 자동으로 '우리동네' 접두어를 붙임)
final mockDeals = generateMockDeals(dealCenter.lat, dealCenter.lng, '');
// [Claude | 2026-08-21] 수정범위: mockDeals 초기값 — Kiro 지적사항 #3, 콜드스타트 때 실제 위치와 무관한 '비산동' 라벨이 붙던 것 중립 라벨로 수정
