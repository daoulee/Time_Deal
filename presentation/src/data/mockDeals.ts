export interface TimeDeal {
  id: string
  shopName: string
  location: string
  productTitle: string
  imageUrl: string
  originalPrice: number
  salePrice: number
  discountPercent: number
  expiresAt: Date
  totalStock: number
  remainingStock: number
  badgeColor: string
}

const now = Date.now()

export const mockDeals: TimeDeal[] = [
  {
    id: '1',
    shopName: '정왕동 식자재마트',
    location: '정왕동',
    productTitle: '한우 1등급 채끝살 300g',
    imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=400&fit=crop&auto=format&q=80',
    originalPrice: 35000,
    salePrice: 21000,
    discountPercent: 40,
    expiresAt: new Date(now + 1 * 60 * 60 * 1000 + 23 * 60 * 1000),
    totalStock: 20,
    remainingStock: 3,
    badgeColor: 'from-red-500 to-orange-500',
  },
  {
    id: '2',
    shopName: '능길동 과일가게',
    location: '능길동',
    productTitle: '유기농 딸기 500g',
    imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&h=400&fit=crop&auto=format&q=80',
    originalPrice: 12000,
    salePrice: 7800,
    discountPercent: 35,
    expiresAt: new Date(now + 2 * 60 * 60 * 1000 + 45 * 60 * 1000),
    totalStock: 30,
    remainingStock: 11,
    badgeColor: 'from-pink-500 to-rose-500',
  },
  {
    id: '3',
    shopName: '시화 베이커리',
    location: '시화동',
    productTitle: '크루아상 + 소금빵 세트 (5개입)',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&h=400&fit=crop&auto=format&q=80',
    originalPrice: 9500,
    salePrice: 6650,
    discountPercent: 30,
    expiresAt: new Date(now + 0 * 60 * 60 * 1000 + 48 * 60 * 1000),
    totalStock: 15,
    remainingStock: 5,
    badgeColor: 'from-amber-500 to-yellow-500',
  },
  {
    id: '4',
    shopName: '정왕 수산시장',
    location: '정왕동',
    productTitle: '신선 고등어 2마리 (당일 직도)',
    imageUrl: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=600&h=400&fit=crop&auto=format&q=80',
    originalPrice: 14000,
    salePrice: 7000,
    discountPercent: 50,
    expiresAt: new Date(now + 3 * 60 * 60 * 1000 + 10 * 60 * 1000),
    totalStock: 25,
    remainingStock: 18,
    badgeColor: 'from-blue-500 to-cyan-500',
  },
]
