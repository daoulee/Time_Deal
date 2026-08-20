import { useMemo, useRef, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Footprints,
  Heart,
  LoaderCircle,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  X,
  Flame,
  Trophy,
  Sunrise,
  BellRing,
  BookOpen,
  Coffee,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authClient } from "@/lib/auth";
import {
  isGoogleMapsConfigured,
  loadGoogleMaps,
} from "@/lib/google-maps-loader";
import { THEME_ROUTE } from "@/shared/categoryData";

// ── 마켓컬리 스타일 2단 카테고리 데이터 ──
const categoryData: Record<string, string[]> = {
  "채소·과일": [
    "친환경",
    "제철과일",
    "국산과일",
    "수입과일",
    "간편과일",
    "냉동·견과일",
  ],
  신선식품: [
    "정육·가공육",
    "달걀·알류",
    "수산·해산물",
    "건어물",
    "반찬·메인요리",
  ],
  "베이커리·델리": [
    "식빵·모닝빵",
    "베이글·식사빵",
    "케이크·타르트",
    "쿠키·스콘",
    "샌드위치·샐러드",
  ],
  "간편식·밀키트": [
    "국·탕·찌개",
    "볶음·찜요리",
    "파스타·면류",
    "냉동볶음밥",
    "떡볶이·분식",
  ],
  "면·양념·오일": [
    "라면·국수",
    "파스타면·소스",
    "오일·식초",
    "설탕·소금·조미료",
    "장류·가루",
  ],
  "음료·우유": [
    "우유·두유",
    "생수·탄산수",
    "과일·채소즙",
    "커피·티백",
    "요거트·디저트",
  ],
  "생활용품·뷰티": [
    "화장지·물티슈",
    "세탁세제·섬유유연제",
    "주방세제",
    "스킨케어",
    "헤어·바디케어",
  ],
};

// ── 검색어 순위 높은 순서대로 정확히 10개 키워드 리스트 ──
const POPULAR_SEARCH_KEYWORDS = [
  "신선식품",
  "베이커리",
  "딸기",
  "소금빵",
  "샐러드",
  "샤인머스캣",
  "함박스테이크",
  "특란",
  "닭가슴살",
  "순대",
];

// ── 상단 메인 네비게이션 주제 ──
const MAIN_NAV_THEMES = [
  "베스트",
  "골든타임",
  "당일마감",
  "지도찾기",
  "신규오픈",
  "특가/공구",
  "모닝픽"
];

// ── 좌측 카테고리 메뉴 목록 ──
const DROPDOWN_CATEGORIES = [
  "전체",
  "신선식품",
  "베이커리",
  "과일·야채",
  "음식·반찬",
  "생활용품",
  "테크·가전",
  "홈·리빙",
  "뷰티",
  "패션",
  "여행",
  "반려동물",
];

// ── 히어로 배너 데이터 ──
const HERO_SLIDES = [
  {
    id: "1",
    tag: "",
    title: "신선함을 먼저 생각하는 \n우리 동네 타임딜",
    desc: "성수동 소상공인 마감 재고 최대 70% 타임딜 오픈!\n이웃들과 함께 모여 확정 할인가로 당일 픽업하세요.",
    img: "https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "5",
    tag: "",
    title: "갓 구운 빵을\n오늘 바로 반값에",
    desc: "성수 명품 베이커리 당일 식빵·소금빵 반값 할인!\n골든 타임 한정으로 갓 구운 풍미 그대로 만납니다.",
    img: "https://images.unsplash.com/photo-1663904460424-91895028aa9e?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "2",
    tag: "",
    title: "퇴근길 도보 5분,\n우리 동네 픽업 특가",
    desc: "도보 5분 내 매장 픽업 퇴근길 전 품목 균일가 특가!\n동네 이웃과 함께 바로 픽업하는 초간편 공구.",
    img: "https://images.unsplash.com/photo-1628689469838-524a4a973b8e?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "4",
    tag: "",
    title: "오늘 아침 산란,\n특란 30구 신선특가",
    desc: "당일 산란한 신선란만 골라 담은 타임딜!\n아침 든든하게 채우는 신선식품을 지금 만나보세요.",
    img: "https://images.unsplash.com/photo-1690983329845-638ec321647d?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "9",
    tag: "",
    title: "친환경 제철 야채,\n오늘만 이 가격",
    desc: "산지에서 바로 온 친환경 방울토마토 타임딜!\n건강한 한 끼를 동네 이웃과 함께 나눠보세요.",
    img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1600&q=80",
  },
];

const TOKENS = {
  colors: {
    navy: "#1a1a1a",
    navyDark: "#000000",
    navyLight: "#4d4d4d",
    primaryOrange: "#ff5722",
    primaryOrangeHover: "#e64a19",
    primaryLight: "#fff5f2",
    canvas: "#ffffff",
    bgMuted: "#f7f9fa",
    textHeading: "#1a1a1a",
    textBody: "#333333",
    textMuted: "#666666",
    textSubtle: "#999999",
    borderLight: "#e2e8f0",
    borderMedium: "#cbd5e1",
    borderDivider: "#d9d9d9",
    badgeDiscount: "#ff5722",
  },
  typography: {
    family:
      "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif",
  },
  shadows: {
    card: "0 2px 10px rgba(0, 0, 0, 0.04)",
    cardHover: "0 8px 24px rgba(0, 0, 0, 0.12)",
    floating: "0 16px 40px rgba(0, 0, 0, 0.15)",
  },
};

const SNS_LINKS = [
  { label: "블로그", icon: BookOpen, url: "https://blog.naver.com/timedeal" },
  { label: "카페", icon: Coffee, url: "https://cafe.naver.com/timedeal" },
  {
    label: "인스타그램",
    icon: FaInstagram,
    url: "https://instagram.com/timedeal_official",
  },
  {
    label: "페이스북",
    icon: FaFacebook,
    url: "https://facebook.com/timedeal.official",
  },
  { label: "엑스", icon: FaXTwitter, url: "https://x.com/timedeal_official" },
];

const RANKING_PARTICIPANTS: Record<string, number> = {
  "1": 95,
  "5": 89,
  "2": 82,
  "7": 77,
  "3": 71,
  "4": 68,
  "8": 63,
  "6": 58,
  "9": 52,
  "10": 49,
};

// ── 재오픈 요청 딜 데이터 ──
const INITIAL_REOPEN_ITEMS = [
  {
    id: "re-1",
    storeName: "성수 수제 함박공방",
    name: "성수 육즙가득 수제 함박스테이크 2인 세트",
    subtitle: "겉은 바삭하고 속은 촉촉한 30년 전통 수제 레시피",
    originalPrice: 24000,
    expectedPrice: 13900,
    requestedCount: 128,
    targetCount: 150,
    image:
      "https://images.unsplash.com/photo-1666013942642-b7b54ecafd7d?auto=format&fit=crop&w=800&q=80",
    tags: ["품절 대란", "재오픈 임박"],
  },
  {
    id: "re-2",
    storeName: "밀도 성수점",
    name: "천연 효모 유기농 밤식빵 & 소금 버터롤",
    subtitle: "진한 천연 버터 풍미와 공주 밤이 듬뿍 들어간 시그니처",
    originalPrice: 16000,
    expectedPrice: 8900,
    requestedCount: 94,
    targetCount: 100,
    image:
      "https://images.unsplash.com/photo-1558745010-d2a3c21762ab?auto=format&fit=crop&w=800&q=80",
    tags: ["달성률 94%", "요청 폭주"],
  },
  {
    id: "re-3",
    storeName: "뚝도청과",
    name: "당일 직송 고당도 샤인머스캣 2송이",
    subtitle: "평균 당도 18브릭스 이상 엄선, 알알이 터지는 과즙",
    originalPrice: 28000,
    expectedPrice: 15900,
    requestedCount: 67,
    targetCount: 80,
    image:
      "https://images.unsplash.com/photo-1641642399576-487909d0ddbc?auto=format&fit=crop&w=800&q=80",
    tags: ["신선보장", "골목 특가"],
  },
];

const MORNING_PREORDER_ITEMS = [
  {
    id: "m1",
    name: "유기농 저지방 우유 900ml",
    price: 2900,
    originalPrice: 4200,
    pickupTime: "07:00 ~ 09:00 픽업",
    image:
      "https://images.unsplash.com/photo-1607292819104-c54624be6bc2?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "m2",
    name: "당일 산란 특란 15구",
    price: 5900,
    originalPrice: 8500,
    pickupTime: "07:00 ~ 09:00 픽업",
    image:
      "https://images.unsplash.com/photo-1598965675045-45c5e72c7d05?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "m3",
    name: "그릭요거트 & 그래놀라 샐러드",
    price: 6500,
    originalPrice: 9800,
    pickupTime: "07:00 ~ 09:00 픽업",
    image:
      "https://images.unsplash.com/photo-1571230389215-b34a89739ef1?auto=format&fit=crop&w=600&q=80",
  },
];

interface DealProduct {
  id: string;
  tag: string;
  category: string;
  name: string;
  dealPrice: number;
  originalPrice: number;
  discountRate: number;
  image: string;
  deadline: string;
}

const PRODUCTS_DATA: DealProduct[] = [
  {
    id: "1",
    tag: "CHEF FAVORITES",
    category: "음식·반찬",
    name: "성수 수제 함박스테이크 & 구운 채소",
    dealPrice: 12900,
    originalPrice: 18000,
    discountRate: 28,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "2",
    tag: "CRAFT BURGER",
    category: "과일·야채",
    name: "산지직송 당도보장 논산 딸기 2팩",
    dealPrice: 8500,
    originalPrice: 12000,
    discountRate: 29,
    image:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "3",
    tag: "WELLNESS",
    category: "생활용품",
    name: "도톰한 3겹 엠보싱 롤화장지 32롤",
    dealPrice: 16900,
    originalPrice: 25000,
    discountRate: 32,
    image:
      "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "4",
    tag: "FAST & EASY",
    category: "신선식품",
    name: "당일 산란 신선한 특란 30구 (1판)",
    dealPrice: 9900,
    originalPrice: 15000,
    discountRate: 34,
    image:
      "https://images.unsplash.com/photo-1690983329845-638ec321647d?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "5",
    tag: "VEGETARIAN",
    category: "베이커리",
    name: "성수 명품 버터 소금빵 4개 세트",
    dealPrice: 7900,
    originalPrice: 12000,
    discountRate: 34,
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "6",
    tag: "PREMIUM",
    category: "신선식품",
    name: "유기농 프리미엄 닭가슴살 샐러드 팩",
    dealPrice: 4900,
    originalPrice: 7500,
    discountRate: 35,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "7",
    tag: "FAMILY FRIENDLY",
    category: "음식·반찬",
    name: "성수동 맛집 30년 전통 수제 모둠 순대",
    dealPrice: 11000,
    originalPrice: 16000,
    discountRate: 31,
    image:
      "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "8",
    tag: "HEAT & EAT",
    category: "음료·카페",
    name: "스페셜티 더치 원액 500ml 1+1",
    dealPrice: 13900,
    originalPrice: 22000,
    discountRate: 37,
    image:
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "9",
    tag: "FRESH PICK",
    category: "과일·야채",
    name: "친환경 유기농 방울토마토 500g",
    dealPrice: 5900,
    originalPrice: 8900,
    discountRate: 34,
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
  {
    id: "10",
    tag: "DAILY ESSENTIAL",
    category: "생활용품",
    name: "천연 소재 부드러운 3겹 티슈 6롤",
    dealPrice: 5900,
    originalPrice: 8500,
    discountRate: 31,
    image:
      "https://images.unsplash.com/photo-1584872238332-fe2b75566ab5?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = authClient.useSession();

  // ── 검색 상태 및 ref ──
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [rankingCategoryTab, setRankingCategoryTab] = useState("전체");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string>("채소·과일");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("성수동 2가");
  const [manualAddress, setManualAddress] = useState("");
  const [locatingHome, setLocatingHome] = useState(false);
  const [homeLocateError, setHomeLocateError] = useState<string | null>(null);

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [votedReopenIds, setVotedReopenIds] = useState<Set<string>>(new Set());
  const [reopenItems, setReopenItems] = useState(INITIAL_REOPEN_ITEMS);

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── 스크롤 참조 및 상태 ──
  const navScrollRef = useRef<HTMLUListElement>(null);
  const [canScrollNavLeft, setCanScrollNavLeft] = useState(false);

  const reopenScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollReopenLeft, setCanScrollReopenLeft] = useState(false);
  const reopenSectionRef = useRef<HTMLElement>(null);
  const morningSectionRef = useRef<HTMLElement>(null);

  const rankingScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRankingLeft, setCanScrollRankingLeft] = useState(false);

  const walkScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollWalkLeft, setCanScrollWalkLeft] = useState(false);

  const RANKING_TABS = useMemo(() => {
    const defaultTabs = [
      "전체",
      "신선식품",
      "과일·야채",
      "생활용품",
      "베이커리",
      "음식·반찬",
    ];
    return Array.from(new Set([...defaultTabs, ...DROPDOWN_CATEGORIES])).slice(
      0,
      6,
    );
  }, []);

  // ── 검색어 순위 높은 순서대로 정확히 10개 필터링 ──
  const searchSuggestions = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      return POPULAR_SEARCH_KEYWORDS.slice(0, 10);
    }
    const matched = POPULAR_SEARCH_KEYWORDS.filter((kw) =>
      kw.toLowerCase().includes(trimmed),
    );
    return matched.length > 0 ? matched.slice(0, 10) : [trimmed];
  }, [searchTerm]);

  // ── 검색 실행 함수 (엔터 / 클릭 공통) ──
  const executeSearch = (keyword: string) => {
    const target = keyword.trim();
    if (!target) return;
    setIsSearchFocused(false);
    navigate(`/products?q=${encodeURIComponent(target)}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(searchTerm);
    }
  };

  // ── 검색창 외부 클릭 시 추천 레이어 닫기 ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const bannerTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(bannerTimer);
  }, []);

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus === "reopen") {
      reopenSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (focus === "morning") {
      morningSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [searchParams]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleNavThemeClick = (theme: string) => {
    setSelectedCategory("전체");
    setSearchTerm("");
    if (theme === "재오픈" && reopenSectionRef.current) {
      reopenSectionRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (theme === "지도찾기" || theme === "내 주변 픽업") {
      navigate("/map");
    } else if (THEME_ROUTE[theme]) {
      navigate(`/products?theme=${THEME_ROUTE[theme]}`);
    }
  };

  const handleNavScroll = (direction: "left" | "right") => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({
        left: direction === "left" ? -220 : 220,
        behavior: "smooth",
      });
    }
  };

  const handleNavScrollCheck = (e: React.UIEvent<HTMLUListElement>) => {
    setCanScrollNavLeft(e.currentTarget.scrollLeft > 10);
  };

  const handleLocateHome = () => {
    if (!navigator.geolocation) {
      setHomeLocateError("이 브라우저에서는 위치 조회를 지원하지 않습니다.");
      return;
    }
    setLocatingHome(true);
    setHomeLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordLabel = `위도 ${latitude.toFixed(5)}, 경도 ${longitude.toFixed(5)}`;
        const applyLocation = (label: string) => {
          setCurrentLocation(label);
          setLocatingHome(false);
          setIsLocationModalOpen(false);
          showToast(`기준 동네가 [${label}]로 설정되었습니다.`);
        };
        if (!isGoogleMapsConfigured) {
          applyLocation(coordLabel);
          return;
        }
        void loadGoogleMaps()
          .then((maps) =>
            new maps.Geocoder().geocode({
              location: { lat: latitude, lng: longitude },
            }),
          )
          .then((response) =>
            applyLocation(response.results[0]?.formatted_address ?? coordLabel),
          )
          .catch(() => applyLocation(coordLabel));
      },
      (geoError) => {
        setLocatingHome(false);
        setHomeLocateError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요."
            : "현재 위치를 확인하지 못했습니다.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleManualAddressSubmit = () => {
    const trimmed = manualAddress.trim();
    if (!trimmed) return;
    setCurrentLocation(trimmed);
    setManualAddress("");
    setIsLocationModalOpen(false);
    showToast(`기준 동네가 [${trimmed}]로 설정되었습니다.`);
  };

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast("관심 딜 목록에서 제외되었습니다.");
      } else {
        next.add(id);
        showToast("관심 딜로 저장되었습니다. ❤️");
      }
      return next;
    });
  };

  const toggleReopenVote = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const isVoted = votedReopenIds.has(id);
    setVotedReopenIds((prev) => {
      const next = new Set(prev);
      if (isVoted) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    setReopenItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            requestedCount: isVoted
              ? item.requestedCount - 1
              : item.requestedCount + 1,
          };
        }
        return item;
      }),
    );

    if (isVoted) {
      showToast(`[${name}] 재오픈 요청이 취소되었습니다.`);
    } else {
      showToast(`🔔 [${name}] 재오픈 알림 요청이 완료되었습니다!`);
    }
  };

  const formatPriceNum = (price: number) => {
    return price.toLocaleString("ko-KR") + "원";
  };

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
    distance: number = 1040,
  ) => {
    if (!ref.current) return;
    ref.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const checkScrollLeft = (
    e: React.UIEvent<HTMLDivElement>,
    setter: (val: boolean) => void,
  ) => {
    setter(e.currentTarget.scrollLeft > 10);
  };

  const rankingItems = useMemo(() => {
    return [...PRODUCTS_DATA]
      .filter((item) => RANKING_PARTICIPANTS[item.id] !== undefined)
      .sort((a, b) => RANKING_PARTICIPANTS[b.id] - RANKING_PARTICIPANTS[a.id])
      .slice(0, 10);
  }, []);

  const categoryRankingItems = useMemo(() => {
    if (rankingCategoryTab === "전체") {
      return PRODUCTS_DATA.slice(0, 9);
    }
    const matched = PRODUCTS_DATA.filter(
      (item) =>
        item.category.includes(rankingCategoryTab) ||
        item.name.includes(rankingCategoryTab),
    );
    return (matched.length > 0 ? matched : PRODUCTS_DATA).slice(0, 9);
  }, [rankingCategoryTab]);

  const renderProductCard = (item: DealProduct) => {
    return (
      <article
        key={item.id}
        onClick={() => navigate(`/products/${item.id}`)}
        style={{
          background: "#ffffff",
          borderRadius: 0,
          border: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          height: "100%",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 330,
            position: "relative",
            background: "#f4f4f4",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <img
            src={item.image}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: TOKENS.colors.badgeDiscount,
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 0,
            }}
          >
            {item.discountRate}% OFF
          </span>
          <button
            onClick={(e) => toggleLike(e, item.id)}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(255,255,255,0.9)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <Heart
              size={16}
              color={
                likedIds.has(item.id) ? TOKENS.colors.primaryOrange : "#888888"
              }
              fill={
                likedIds.has(item.id) ? TOKENS.colors.primaryOrange : "none"
              }
            />
          </button>
        </div>

        <div style={{ padding: "14px 2px 0" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: TOKENS.colors.textSubtle,
              marginBottom: 4,
            }}
          >
            {item.category}
          </div>

          <h3
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: TOKENS.colors.textHeading,
              margin: "0 0 8px 0",
              lineHeight: "22px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              minHeight: 44,
            }}
          >
            {item.name}
          </h3>

          <div>
            {item.originalPrice > item.dealPrice && (
              <del
                style={{
                  fontSize: 12,
                  color: TOKENS.colors.textSubtle,
                  display: "block",
                  marginBottom: 2,
                }}
              >
                {formatPriceNum(item.originalPrice)}
              </del>
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              {item.discountRate > 0 && (
                <strong
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: TOKENS.colors.primaryOrange,
                  }}
                >
                  {item.discountRate}%
                </strong>
              )}
              <strong
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: TOKENS.colors.textHeading,
                }}
              >
                {formatPriceNum(item.dealPrice)}
              </strong>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div
      style={{
        fontFamily: TOKENS.typography.family,
        color: TOKENS.colors.textBody,
        background: TOKENS.colors.canvas,
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
      {/* ── 글로벌 토스트 알림 ── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 40,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(26, 26, 26, 0.95)",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: 30,
            fontSize: 14,
            fontWeight: 400,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: TOKENS.shadows.floating,
            backdropFilter: "blur(6px)",
          }}
        >
          <BellRing size={16} color={TOKENS.colors.primaryOrange} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 유틸리티 바 ── */}
      <div
        style={{
          width: "100%",
          maxWidth: 1050,
          margin: "0 auto",
          padding: "12px 16px 0",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          fontSize: 12,
          letterSpacing: "-0.3px",
          boxSizing: "border-box",
        }}
      >
        {session?.user ? (
          <span
            style={{
              cursor: "pointer",
              color: TOKENS.colors.primaryOrange,
              fontWeight: 500,
            }}
            onClick={() => navigate("/mypage")}
          >
            마이페이지로 이동
          </span>
        ) : (
          <>
            <span
              style={{
                cursor: "pointer",
                color: TOKENS.colors.primaryOrange,
                fontWeight: 400,
              }}
              onClick={() => navigate("/auth?mode=signup")}
            >
              회원가입
            </span>
            <span
              style={{
                width: 1,
                height: 13,
                background: TOKENS.colors.borderDivider,
                margin: "0 10px",
                display: "inline-block",
              }}
            />
            <span
              style={{ cursor: "pointer", color: "#333333" }}
              onClick={() => navigate("/auth")}
            >
              로그인
            </span>
          </>
        )}
        <span
          style={{
            width: 1,
            height: 13,
            background: TOKENS.colors.borderDivider,
            margin: "0 10px",
            display: "inline-block",
          }}
        />
        <div
          onMouseEnter={() => setIsCustomerMenuOpen(true)}
          onMouseLeave={() => setIsCustomerMenuOpen(false)}
          style={{ position: "relative" }}
        >
          <span style={{ cursor: "pointer", color: "#333333" }}>
            고객센터 ▾
          </span>
          {isCustomerMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 20,
                right: 0,
                width: 160,
                background: "#ffffff",
                border: `1px solid ${TOKENS.colors.borderMedium}`,
                boxShadow: TOKENS.shadows.floating,
                borderRadius: 8,
                zIndex: 210,
                padding: "6px 0",
                textAlign: "left",
              }}
            >
              {[
                { label: "공지사항", to: "/notices" },
                { label: "자주하는 질문", to: "/faq" },
                { label: "1:1 문의", to: "/inquiry" },
                { label: "대량주문 문의", to: "/inquiry?category=bulk" },
              ].map((item) => (
                <div
                  key={item.label}
                  onClick={() => {
                    setIsCustomerMenuOpen(false);
                    navigate(item.to);
                  }}
                  style={{
                    padding: "9px 16px",
                    fontSize: 13,
                    color: "#333333",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. 메인 헤더 ── */}
      <header
        style={{
          width: "100%",
          maxWidth: 1050,
          margin: "0 auto",
          padding: "16px 16px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link
            to="/"
            aria-label="타임딜 홈"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              height: 42,
              marginRight: 16,
            }}
          >
            <img
              src="/images/deal-logo.png"
              alt="타임딜"
              style={{ height: 30, width: "auto", display: "block" }}
            />
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                color: TOKENS.colors.primaryOrange,
                cursor: "pointer",
                padding: "4px 0",
              }}
              onClick={() => setSelectedCategory("전체")}
            >
              마감특가
            </span>
            <span
              style={{
                width: 1,
                height: 14,
                background: "#e2e2e2",
                margin: "0 12px",
                display: "inline-block",
              }}
            />
            <span
              style={{
                color: TOKENS.colors.textSubtle,
                cursor: "pointer",
                padding: "4px 0",
                transition: "color 0.15s ease",
              }}
              onClick={() => navigate("/community")}
            >
              커뮤니티
            </span>
          </div>
        </div>

        {/* ── 검색창 + 회색 테두리 연관검색어 10개 레이어 ── */}
        <div
          ref={searchContainerRef}
          style={{ position: "relative", width: 400 }}
        >
          <div
            style={{
              width: "100%",
              height: 44,
              border: `1.5px solid ${isSearchFocused ? TOKENS.colors.primaryOrange : TOKENS.colors.navy}`,
              borderRadius: isSearchFocused ? "6px 6px 0 0" : 6,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              background: "#ffffff",
              boxSizing: "border-box",
              transition: "border-color 0.15s ease",
            }}
          >
            <input
              type="text"
              placeholder="마감 임박 신선식품, 계란, 샐러드 검색"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: TOKENS.colors.textBody,
                letterSpacing: "-0.3px",
              }}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: TOKENS.colors.textSubtle,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 4px",
                }}
              >
                <X size={18} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => executeSearch(searchTerm)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "0 0 0 4px",
              }}
            >
              <Search
                size={22}
                color={
                  isSearchFocused
                    ? TOKENS.colors.primaryOrange
                    : TOKENS.colors.navy
                }
              />
            </button>
          </div>

          {/* 회색 테두리 연관 검색어 레이어 */}
          {isSearchFocused && (
            <div
              style={{
                position: "absolute",
                top: 44,
                left: 0,
                right: 0,
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                borderTop: "none",
                borderRadius: "0 0 6px 6px",
                boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
                zIndex: 200,
                maxHeight: 380,
                overflowY: "auto",
                padding: "8px 0",
              }}
            >
              <div
                onClick={() => executeSearch("이벤트")}
                style={{
                  padding: "10px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#222222",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#fafafa",
                }}
              >
                <span>
                  타임딜 이웃 오픈 특가{" "}
                  <b style={{ color: TOKENS.colors.primaryOrange }}>이벤트</b>
                </span>
                <ChevronRightIcon size={14} color="#999" />
              </div>

              {searchSuggestions.map((kw, idx) => (
                <div
                  key={`${kw}-${idx}`}
                  onClick={() => {
                    setSearchTerm(kw);
                    executeSearch(kw);
                  }}
                  style={{
                    padding: "10px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#333333",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                    e.currentTarget.style.color = TOKENS.colors.primaryOrange;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#333333";
                  }}
                >
                  <Search size={15} color="#999999" />
                  <span style={{ flex: 1 }}>{kw}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              transition: "background-color 0.15s",
            }}
            onClick={() => setIsLocationModalOpen(true)}
            title="동네 설정"
          >
            <MapPin
              size={22}
              strokeWidth={1.7}
              color={TOKENS.colors.primaryOrange}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: TOKENS.colors.navy,
                whiteSpace: "nowrap",
              }}
            >
              {currentLocation}
            </span>
          </div>

          <div
            style={{
              width: 36,
              height: 36,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => navigate("/mypage")}
            title="찜한 상품"
          >
            <Heart
              size={24}
              strokeWidth={1.5}
              color={
                likedIds.size > 0
                  ? TOKENS.colors.primaryOrange
                  : TOKENS.colors.navy
              }
              fill={likedIds.size > 0 ? TOKENS.colors.primaryOrange : "none"}
            />
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              position: "relative",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => navigate("/mypage/orders")}
            title="장바구니/예약"
          >
            <ShoppingCart
              size={24}
              strokeWidth={1.5}
              color={TOKENS.colors.navy}
            />
            {likedIds.size > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  right: -2,
                  background: TOKENS.colors.primaryOrange,
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {likedIds.size}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── 4. 메인 네비게이션 ── */}
      <nav
        style={{
          width: "100%",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          padding: "16px 0",
        }}
      >
        <div
          style={{
            maxWidth: 1050,
            margin: "0 auto",
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              flex: 1,
              minWidth: 0,
              position: "relative",
            }}
          >
            <div
              onMouseEnter={() => setIsCategoryMenuOpen(true)}
              onMouseLeave={() => setIsCategoryMenuOpen(false)}
              style={{ position: "relative", flexShrink: 0, zIndex: 110 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 15,
                  color: isCategoryMenuOpen
                    ? TOKENS.colors.primaryOrange
                    : "#1a1a1a",
                  paddingRight: 18,
                  borderRight: `1px solid ${TOKENS.colors.borderLight}`,
                  height: 48,
                  whiteSpace: "nowrap",
                }}
              >
                <Menu size={19} strokeWidth={2.4} />
                <span>카테고리</span>
              </div>

              {isCategoryMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 48,
                    left: 0,
                    width: 520,
                    background: "#ffffff",
                    border: `1px solid ${TOKENS.colors.borderMedium}`,
                    boxShadow: TOKENS.shadows.floating,
                    zIndex: 120,
                    display: "flex",
                    borderRadius: "0 0 8px 8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "220px",
                      background: "#f8f9fa",
                      borderRight: `1px solid ${TOKENS.colors.borderLight}`,
                      padding: "8px 0",
                    }}
                  >
                    {Object.keys(categoryData).map((catName) => (
                      <div
                        key={catName}
                        onMouseEnter={() => setHoveredCategory(catName)}
                        style={{
                          padding: "11px 18px",
                          fontSize: 14,
                          fontWeight: hoveredCategory === catName ? 600 : 400,
                          color:
                            hoveredCategory === catName
                              ? TOKENS.colors.primaryOrange
                              : "#333333",
                          background:
                            hoveredCategory === catName
                              ? "#ffffff"
                              : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{catName}</span>
                        <ChevronRightIcon size={14} color="#999" />
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: "#ffffff",
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: TOKENS.colors.textSubtle,
                        marginBottom: 4,
                        borderBottom: `1px solid ${TOKENS.colors.borderLight}`,
                        paddingBottom: 6,
                      }}
                    >
                      {hoveredCategory} 전체보기
                    </div>
                    {categoryData[hoveredCategory]?.map((subItem) => (
                      <div
                        key={subItem}
                        onClick={() => {
                          setSelectedCategory(subItem);
                          setIsCategoryMenuOpen(false);
                          showToast(`[${subItem}] 카테고리가 선택되었습니다.`);
                        }}
                        style={{
                          fontSize: 14,
                          color: "#333333",
                          cursor: "pointer",
                          padding: "4px 0",
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color =
                            TOKENS.colors.primaryOrange)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#333333")
                        }
                      >
                        {subItem}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {canScrollNavLeft && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 48,
                    background:
                      "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.92) 45%, rgba(255,255,255,0) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    zIndex: 10,
                  }}
                >
                  <button
                    onClick={() => handleNavScroll("left")}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                      color: "#555555",
                    }}
                    title="이전 카테고리 보기"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              )}

              <ul
                ref={navScrollRef}
                onScroll={handleNavScrollCheck}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 36,
                  listStyle: "none",
                  margin: 0,
                  padding: canScrollNavLeft ? "0 40px" : "0 40px 0 0",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  width: "100%",
                  scrollBehavior: "smooth",
                }}
              >
                {MAIN_NAV_THEMES.map((tab) => {
                  const isSelected = selectedCategory === tab;
                  return (
                    <li key={tab} style={{ flexShrink: 0 }}>
                      <span
                        onClick={() => handleNavThemeClick(tab)}
                        style={{
                          display: "inline-block",
                          fontSize: 15,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected
                            ? TOKENS.colors.primaryOrange
                            : "#222222",
                          cursor: "pointer",
                          letterSpacing: "-0.3px",
                          lineHeight: "48px",
                          borderBottom: isSelected
                            ? `2.5px solid ${TOKENS.colors.primaryOrange}`
                            : "2.5px solid transparent",
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tab}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 48,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 45%, #ffffff 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  zIndex: 10,
                }}
              >
                <button
                  onClick={() => handleNavScroll("right")}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    color: "#555555",
                  }}
                  title="다음 카테고리 보기"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/auction")}
            style={{
              border: `1.5px solid ${TOKENS.colors.primaryOrange}`,
              borderRadius: 24,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: TOKENS.colors.primaryOrange,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              background: TOKENS.colors.primaryLight,
              marginLeft: 16,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            🐟 직판장 경매
          </button>
        </div>
      </nav>

      {/* ── 5. 사진 풀블리드 히어로 배너 (직각 복원) ── */}
      <section
        style={{
          width: "100vw",
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)",
          height: 460,
          overflow: "hidden",
          marginBottom: 48,
          borderRadius: 0, // 직각 복원
        }}
      >
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === currentHeroIndex;
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              style={{
                position: "absolute",
                inset: 0,
                opacity: isActive ? 1 : 0,
                transition: "opacity 0.9s ease",
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              <img
                src={slide.img}
                alt={slide.title}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0) 100%)",
                }}
              />

              <div
                style={{
                  maxWidth: 1050,
                  margin: "0 auto",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                  padding: "0 16px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ maxWidth: 470, zIndex: 2 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: "#ffb199",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      display: "inline-block",
                      marginBottom: 8,
                    }}
                  >
                    {slide.tag}
                  </span>
                  <h1
                    style={{
                      fontSize: 42,
                      fontWeight: 700,
                      color: "#ffffff",
                      lineHeight: "1.18",
                      margin: "0 0 14px 0",
                      letterSpacing: "-1px",
                      whiteSpace: "pre-line",
                      textShadow: "0 2px 12px rgba(0,0,0,0.25)",
                    }}
                  >
                    {slide.title}
                  </h1>
                  <p
                    style={{
                      fontSize: 15,
                      color: "rgba(255,255,255,0.88)",
                      lineHeight: "1.5",
                      margin: "0 0 28px 0",
                      fontWeight: 400,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {slide.desc}
                  </p>

                  <button
                    onClick={() => navigate(`/products/${slide.id}`)}
                    style={{
                      backgroundColor: TOKENS.colors.navy,
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 30,
                      padding: "14px 34px",
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: "0.8px",
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        TOKENS.colors.navyDark)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        TOKENS.colors.navy)
                    }
                  >
                    지금 바로 특가 보러가기
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: "calc((100vw - 1050px) / 2 + 16px)",
            background: "rgba(0,0,0,0.45)",
            color: "#ffffff",
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 400,
            display: "flex",
            alignItems: "center",
            gap: 8,
            backdropFilter: "blur(4px)",
            zIndex: 2,
          }}
        >
          <span>
            <b>0{currentHeroIndex + 1}</b> / 0{HERO_SLIDES.length}
          </span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ cursor: "pointer" }}>전체보기 &gt;</span>
        </div>

        <button
          onClick={() =>
            setCurrentHeroIndex((prev) =>
              prev === 0 ? HERO_SLIDES.length - 1 : prev - 1,
            )
          }
          style={{
            position: "absolute",
            left: "calc((100vw - 1050px) / 2 - 64px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.25)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.4)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.25)")
          }
        >
          <ChevronLeft size={26} color="#ffffff" />
        </button>

        <button
          onClick={() =>
            setCurrentHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)
          }
          style={{
            position: "absolute",
            right: "calc((100vw - 1050px) / 2 - 64px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.25)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.4)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.25)")
          }
        >
          <ChevronRight size={26} color="#ffffff" />
        </button>
      </section>

      {/* ── 6. 메인 본문 컨테이너 ── */}
      <main
        style={{
          width: "100%",
          maxWidth: 1050,
          margin: "0 auto",
          padding: "0 16px 100px",
          boxSizing: "border-box",
        }}
      >
        {/* [순서 1] 🌅 내일 아침 출근길 모닝픽업 */}
        <section
          ref={morningSectionRef}
          style={{
            marginBottom: 80,
            background: "#ffffff",
            borderRadius: 0,
            padding: "24px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 60 }}>
            <div style={{ width: 320, flexShrink: 0, paddingTop: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: TOKENS.colors.primaryOrange,
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                내일 아침 픽업
              </span>
              <h2
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: TOKENS.colors.textHeading,
                  lineHeight: "1.25",
                  margin: "0 0 16px 0",
                  letterSpacing: "-0.5px",
                  whiteSpace: "pre-line",
                }}
              >
                "내일 아침, 출근길에 바로 픽업하세요"
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: TOKENS.colors.textSubtle,
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                오늘 밤 미리 예약하고 내일 아침 7시부터 신선하게 픽업하세요.
                망설이면 늦어요!
              </p>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {MORNING_PREORDER_ITEMS.slice(0, 1).map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    showToast("내일 아침 픽업 사전예약이 완료되었습니다!")
                  }
                  style={{
                    position: "relative",
                    background: "#ffffff",
                    borderRadius: 0,
                    border: "none",
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 380,
                      position: "relative",
                      background: "#f4f4f4",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80"
                      alt="신선한 샐러드"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        background: "#8558F9",
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 0,
                      }}
                    >
                      모닝특가
                    </span>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(255, 255, 255, 0.92)",
                        padding: "14px",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#333",
                        borderTop: "1px solid #eaeaea",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      예약하기
                    </div>
                  </div>

                  <div style={{ padding: "16px 2px 0" }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: TOKENS.colors.textSubtle,
                        marginBottom: 4,
                      }}
                    >
                      상쾌한 아침을 여는 신선 샐러드 & 그릭요거트 패키지
                    </div>
                    <h3
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: TOKENS.colors.textHeading,
                        margin: "0 0 10px 0",
                        lineHeight: "24px",
                      }}
                    >
                      [모닝특가] 신선 유기농 아침 샐러드 & 그래놀라 세트
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: TOKENS.colors.primaryOrange,
                        }}
                      >
                        35%
                      </strong>
                      <strong
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: TOKENS.colors.textHeading,
                        }}
                      >
                        6,500원
                      </strong>
                      <del
                        style={{
                          fontSize: 14,
                          color: TOKENS.colors.textSubtle,
                        }}
                      >
                        9,800원
                      </del>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: TOKENS.colors.textMuted,
                        marginTop: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      07:00 ~ 09:00 픽업
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* [순서 2] 실시간 인기 공구 TOP 10 */}
        <section
          style={{ marginBottom: 80, position: "relative", width: "100%" }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 600,
                margin: "0 0 8px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: TOKENS.colors.navy,
              }}
            >
              <Trophy size={24} color={TOKENS.colors.primaryOrange} />{" "}
              {currentLocation} 실시간 인기 공구 TOP 10
            </h2>
            <p
              style={{
                fontSize: 15,
                color: TOKENS.colors.textSubtle,
                margin: 0,
              }}
            >
              지금 우리 동네 이웃들이 가장 많이 참여하고 있는 타임딜이에요
            </p>
          </div>

          <div style={{ position: "relative", width: "100%" }}>
            {canScrollRankingLeft && (
              <button
                onClick={() => handleScroll(rankingScrollRef, "left")}
                style={{
                  position: "absolute",
                  left: -20,
                  top: "40%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: `1px solid ${TOKENS.colors.borderMedium}`,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 30,
                }}
              >
                <ChevronLeft size={22} color={TOKENS.colors.textBody} />
              </button>
            )}

            <button
              onClick={() => handleScroll(rankingScrollRef, "right")}
              style={{
                position: "absolute",
                right: -20,
                top: "40%",
                transform: "translateY(-50%)",
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: `1px solid ${TOKENS.colors.borderMedium}`,
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 30,
              }}
            >
              <ChevronRight size={22} color={TOKENS.colors.textBody} />
            </button>

            <div
              ref={rankingScrollRef}
              onScroll={(e) => checkScrollLeft(e, setCanScrollRankingLeft)}
              style={{
                display: "flex",
                gap: 20,
                overflowX: "auto",
                scrollBehavior: "smooth",
                scrollbarWidth: "none",
                padding: "4px 2px",
              }}
            >
              {rankingItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/products/${item.id}`)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    flex: "0 0 250px",
                    minWidth: 250,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 330,
                      borderRadius: 0,
                      overflow: "hidden",
                      background: "#f4f4f4",
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background: TOKENS.colors.badgeDiscount,
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 0,
                      }}
                    >
                      {item.discountRate}% OFF
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: 34,
                        height: 34,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: idx < 3 ? 18 : 15,
                        fontWeight: 700,
                        color: "#ffffff",
                        background:
                          idx === 0
                            ? TOKENS.colors.primaryOrange
                            : "rgba(0,0,0,0.65)",
                        borderTopRightRadius: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  <div style={{ padding: "14px 2px 0" }}>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 400,
                        color: TOKENS.colors.textHeading,
                        margin: "0 0 8px 0",
                        lineHeight: "22px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        minHeight: 44,
                      }}
                    >
                      {item.name}
                    </h3>
                    <div>
                      {item.originalPrice > item.dealPrice && (
                        <del
                          style={{
                            fontSize: 12,
                            color: TOKENS.colors.textSubtle,
                            display: "block",
                            marginBottom: 2,
                          }}
                        >
                          {formatPriceNum(item.originalPrice)}
                        </del>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 6,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: TOKENS.colors.primaryOrange,
                          }}
                        >
                          {item.discountRate}%
                        </strong>
                        <strong
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: TOKENS.colors.textHeading,
                          }}
                        >
                          {formatPriceNum(item.dealPrice)}
                        </strong>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: TOKENS.colors.textSubtle,
                          marginTop: 4,
                        }}
                      >
                        🔥 {RANKING_PARTICIPANTS[item.id] || 50}명 참여중
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* [순서 3] 오늘의 카테고리 랭킹 */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 600,
                margin: "0 0 8px 0",
                color: TOKENS.colors.textHeading,
              }}
            >
              오늘의 카테고리 랭킹
            </h2>
            <p
              style={{
                fontSize: 15,
                color: TOKENS.colors.textSubtle,
                margin: 0,
              }}
            >
              카테고리별로 가장 많이 팔린 타임딜을 확인해보세요
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 12,
              marginBottom: 36,
            }}
          >
            {RANKING_TABS.map((cat) => (
              <button
                key={cat}
                onClick={() => setRankingCategoryTab(cat)}
                style={{
                  padding: "11px 0",
                  borderRadius: 0,
                  border: `1px solid ${
                    rankingCategoryTab === cat
                      ? TOKENS.colors.navy
                      : TOKENS.colors.borderLight
                  }`,
                  background:
                    rankingCategoryTab === cat ? TOKENS.colors.navy : "#ffffff",
                  color:
                    rankingCategoryTab === cat
                      ? "#ffffff"
                      : TOKENS.colors.textBody,
                  fontSize: 14,
                  fontWeight: rankingCategoryTab === cat ? 600 : 400,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                }}
              >
                {cat} TOP
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "32px 28px",
            }}
          >
            {categoryRankingItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => navigate(`/products/${item.id}`)}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 18,
                  cursor: "pointer",
                  background: "#ffffff",
                  position: "relative",
                  minHeight: 160,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 140,
                    height: 160,
                    borderRadius: 0,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#f4f4f4",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    paddingTop: 2,
                    paddingBottom: 4,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 19,
                        fontWeight: 700,
                        color: TOKENS.colors.textHeading,
                        lineHeight: 1,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <h4
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: TOKENS.colors.textBody,
                        lineHeight: "20px",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.name}
                    </h4>
                  </div>

                  <div>
                    {item.originalPrice > item.dealPrice && (
                      <del
                        style={{
                          fontSize: 12,
                          color: TOKENS.colors.textSubtle,
                          display: "block",
                          marginBottom: 2,
                        }}
                      >
                        {formatPriceNum(item.originalPrice)}
                      </del>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                      }}
                    >
                      {item.discountRate > 0 && (
                        <strong
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: TOKENS.colors.primaryOrange,
                          }}
                        >
                          {item.discountRate}%
                        </strong>
                      )}
                      <strong
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: TOKENS.colors.textHeading,
                        }}
                      >
                        {formatPriceNum(item.dealPrice)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* [순서 4] 걸어서 5분 거리! 퇴근길 픽업 특가 */}
        <section
          style={{ marginBottom: 80, position: "relative", width: "100%" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 28,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  margin: "0 0 6px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: TOKENS.colors.navy,
                }}
              >
                <Footprints size={22} color={TOKENS.colors.primaryOrange} />{" "}
                걸어서 5분 거리! 퇴근길 픽업 특가
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: TOKENS.colors.textSubtle,
                  margin: 0,
                }}
              >
                퇴근길에 바로 들러 픽업 가능한 가장 가까운 가게
              </p>
            </div>
            <button
              onClick={() => navigate("/map")}
              style={{
                background: "none",
                border: `1.5px solid ${TOKENS.colors.navy}`,
                padding: "8px 16px",
                borderRadius: 0,
                fontSize: 13,
                fontWeight: 500,
                color: TOKENS.colors.navy,
                cursor: "pointer",
              }}
            >
              지도에서 찾기 📍
            </button>
          </div>

          <div style={{ position: "relative", width: "100%" }}>
            {canScrollWalkLeft && (
              <button
                onClick={() => handleScroll(walkScrollRef, "left")}
                style={{
                  position: "absolute",
                  left: -20,
                  top: "40%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: `1px solid ${TOKENS.colors.borderMedium}`,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 30,
                }}
              >
                <ChevronLeft size={22} color={TOKENS.colors.textBody} />
              </button>
            )}

            <button
              onClick={() => handleScroll(walkScrollRef, "right")}
              style={{
                position: "absolute",
                right: -20,
                top: "40%",
                transform: "translateY(-50%)",
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: `1px solid ${TOKENS.colors.borderMedium}`,
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 30,
              }}
            >
              <ChevronRight size={22} color={TOKENS.colors.textBody} />
            </button>

            <div
              ref={walkScrollRef}
              onScroll={(e) => checkScrollLeft(e, setCanScrollWalkLeft)}
              style={{
                display: "flex",
                gap: 20,
                overflowX: "auto",
                scrollBehavior: "smooth",
                scrollbarWidth: "none",
                padding: "4px 2px",
              }}
            >
              {PRODUCTS_DATA.slice(2, 10).map((item) => (
                <div
                  key={item.id}
                  style={{
                    flex: "0 0 calc((100% - 60px) / 4)",
                    minWidth: 236,
                  }}
                >
                  {renderProductCard(item)}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* [순서 5] 이 딜 다시 열어주세요! */}
        <section
          ref={reopenSectionRef}
          style={{
            marginBottom: 80,
            position: "relative",
            width: "100%",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 600,
                margin: "0 0 8px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: TOKENS.colors.navy,
                cursor: "pointer",
              }}
              onClick={() => showToast("재오픈 요청 전체 목록으로 이동합니다.")}
            >
              <Flame size={24} color={TOKENS.colors.primaryOrange} /> 이 딜 다시
              열어주세요! &gt;
            </h2>
            <p
              style={{
                fontSize: 15,
                color: TOKENS.colors.textSubtle,
                margin: 0,
              }}
            >
              품절되어 아쉬웠던 인기 타임딜, 투표가 모이면 사장님께 타임딜 오픈
              요청이 전달돼요!
            </p>
          </div>

          <div style={{ position: "relative", width: "100%" }}>
            {canScrollReopenLeft && (
              <button
                onClick={() => handleScroll(reopenScrollRef, "left", 530)}
                style={{
                  position: "absolute",
                  left: -20,
                  top: "40%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: `1px solid ${TOKENS.colors.borderMedium}`,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 30,
                }}
              >
                <ChevronLeft size={22} color={TOKENS.colors.textBody} />
              </button>
            )}

            <button
              onClick={() => handleScroll(reopenScrollRef, "right", 530)}
              style={{
                position: "absolute",
                right: -20,
                top: "40%",
                transform: "translateY(-50%)",
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: `1px solid ${TOKENS.colors.borderMedium}`,
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 30,
              }}
            >
              <ChevronRight size={22} color={TOKENS.colors.textBody} />
            </button>

            <div
              ref={reopenScrollRef}
              onScroll={(e) => checkScrollLeft(e, setCanScrollReopenLeft)}
              style={{
                display: "flex",
                gap: 20,
                overflowX: "auto",
                scrollBehavior: "smooth",
                scrollbarWidth: "none",
                padding: "4px 2px",
              }}
            >
              {reopenItems.map((item) => {
                const isVoted = votedReopenIds.has(item.id);
                const progressPercent = Math.min(
                  100,
                  Math.round((item.requestedCount / item.targetCount) * 100),
                );

                return (
                  <div
                    key={item.id}
                    style={{
                      flex: "0 0 calc((100% - 20px) / 2)",
                      minWidth: 480,
                      borderRadius: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      background: "#ffffff",
                      border: `1px solid ${TOKENS.colors.borderLight}`,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                    }}
                    onClick={(e) => toggleReopenVote(e, item.id, item.name)}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 270,
                        overflow: "hidden",
                        background: "#f4f4f4",
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.3s ease",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          top: 14,
                          left: 14,
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              color: "#ffffff",
                              fontSize: 13,
                              fontWeight: 700,
                              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                              letterSpacing: "-0.2px",
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        padding: "24px 26px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: TOKENS.colors.primaryOrange,
                              marginBottom: 4,
                            }}
                          >
                            {item.storeName}
                          </div>
                          <h3
                            style={{
                              fontSize: 19,
                              fontWeight: 600,
                              color: TOKENS.colors.textHeading,
                              margin: "0 0 6px 0",
                              lineHeight: "26px",
                              letterSpacing: "-0.4px",
                            }}
                          >
                            {item.name}
                          </h3>
                          <p
                            style={{
                              fontSize: 14,
                              color: TOKENS.colors.textMuted,
                              margin: 0,
                              lineHeight: "20px",
                            }}
                          >
                            {item.subtitle}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReopenVote(e, item.id, item.name);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: "6px 10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: isVoted
                              ? TOKENS.colors.primaryOrange
                              : "#555555",
                            fontWeight: 700,
                            fontSize: 14,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <BellRing
                            size={17}
                            color={
                              isVoted ? TOKENS.colors.primaryOrange : "#555555"
                            }
                          />
                          <span>{isVoted ? "요청완료" : "요청하기"}</span>
                        </button>
                      </div>

                      <div
                        style={{
                          paddingTop: 10,
                          borderTop: `1px solid ${TOKENS.colors.borderLight}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                color: TOKENS.colors.textSubtle,
                              }}
                            >
                              예상 특가
                            </span>
                            <strong
                              style={{
                                fontSize: 18,
                                fontWeight: 700,
                                color: TOKENS.colors.textHeading,
                              }}
                            >
                              {formatPriceNum(item.expectedPrice)}
                            </strong>
                            <del
                              style={{
                                fontSize: 13,
                                color: TOKENS.colors.textSubtle,
                              }}
                            >
                              {formatPriceNum(item.originalPrice)}
                            </del>
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: TOKENS.colors.primaryOrange,
                            }}
                          >
                            {item.requestedCount}명 요청 ({progressPercent}%)
                          </span>
                        </div>

                        <div
                          style={{
                            width: "100%",
                            height: 6,
                            background: "#eaeaea",
                            borderRadius: 0,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${progressPercent}%`,
                              height: "100%",
                              background: TOKENS.colors.primaryOrange,
                              borderRadius: 0,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* [순서 6] 💜 재구매 TOP 인기템 */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 600,
                margin: "0 0 6px 0",
                color: TOKENS.colors.textHeading,
              }}
            >
              💜 재구매만 500회 이상 기록!
            </h2>
            <p
              style={{
                fontSize: 14,
                color: TOKENS.colors.textSubtle,
                margin: 0,
              }}
            >
              한 번 맛보면 또 찾게 되는 이웃들의 인기 재구매템
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
            }}
          >
            {["10", "4", "8", "6"]
              .map((id) => PRODUCTS_DATA.find((p) => p.id === id))
              .filter((item): item is DealProduct => Boolean(item))
              .map((item) => (
                <div
                  key={item.id}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <div
                    onClick={() => navigate(`/products/${item.id}`)}
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 330,
                      borderRadius: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "#f4f4f4",
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background: TOKENS.colors.primaryOrange,
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 0,
                      }}
                    >
                      최대 {item.discountRate}% 쿠폰
                    </span>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 400,
                        color: TOKENS.colors.textBody,
                        margin: "0 0 8px 0",
                        lineHeight: "22px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: TOKENS.colors.primaryOrange,
                        }}
                      >
                        {item.discountRate}%
                      </strong>
                      <strong
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: TOKENS.colors.textHeading,
                        }}
                      >
                        {formatPriceNum(item.dealPrice)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>

      {/* ── 하단 푸터 ── */}
      <footer
        style={{
          width: "100%",
          background: TOKENS.colors.bgMuted,
          borderTop: `1px solid ${TOKENS.colors.borderLight}`,
          marginTop: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1050,
            margin: "0 auto",
            padding: "40px 16px 48px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            {[
              "회사소개",
              "이용약관",
              "개인정보처리방침",
              "이메일무단수집거부",
              "고객센터",
            ].map((label, idx, arr) => (
              <span
                key={label}
                style={{ display: "flex", alignItems: "center" }}
              >
                <span
                  onClick={() => navigate("/community")}
                  style={{
                    cursor: "pointer",
                    color:
                      label === "개인정보처리방침"
                        ? TOKENS.colors.textHeading
                        : TOKENS.colors.textMuted,
                    fontWeight: label === "개인정보처리방침" ? 600 : 400,
                  }}
                >
                  {label}
                </span>
                {idx < arr.length - 1 && (
                  <span
                    style={{
                      width: 1,
                      height: 11,
                      background: TOKENS.colors.borderDivider,
                      margin: "0 10px",
                    }}
                  />
                )}
              </span>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {SNS_LINKS.map(({ label, icon: Icon, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: `1px solid ${TOKENS.colors.borderMedium}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: TOKENS.colors.textMuted,
                  background: "#ffffff",
                  textDecoration: "none",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = TOKENS.colors.primaryOrange;
                  e.currentTarget.style.borderColor =
                    TOKENS.colors.primaryOrange;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = TOKENS.colors.textMuted;
                  e.currentTarget.style.borderColor =
                    TOKENS.colors.borderMedium;
                }}
              >
                <Icon size={16} />
              </a>
            ))}
          </div>

          <div
            style={{
              fontSize: 12,
              color: TOKENS.colors.textSubtle,
              lineHeight: "22px",
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <b style={{ color: TOKENS.colors.textMuted, fontWeight: 500 }}>
                (주)타임딜컴퍼니
              </b>{" "}
              · 대표이사 김성수 · 사업자등록번호 123-45-67890 · 통신판매업신고
              제2026-서울성동-0123호
            </div>
            <div style={{ marginBottom: 4 }}>
              주소 서울특별시 성동구 성수이로 20길 16, 4층 (성수동2가) ·
              대표전화 1588-0000 (평일 09:00~18:00) · 이메일
              help@timedeal.example
            </div>
            <div>© 2026 TimeDeal Company Inc. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* ── 동네 설정 모달 ── */}
      {isLocationModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              padding: 28,
              width: 380,
              boxShadow: TOKENS.shadows.floating,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  margin: 0,
                  color: TOKENS.colors.navy,
                }}
              >
                📍 내 동네 설정
              </h3>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p
              style={{
                fontSize: 13,
                color: TOKENS.colors.textSubtle,
                margin: "0 0 20px 0",
              }}
            >
              타임딜을 조회할 기준 동네를 선택해 주세요.
            </p>

            <button
              onClick={handleLocateHome}
              disabled={locatingHome}
              style={{
                width: "100%",
                padding: "12px 14px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 4,
                border: `1px solid ${TOKENS.colors.primaryOrange}`,
                background: TOKENS.colors.primaryLight,
                color: TOKENS.colors.primaryOrange,
                fontWeight: 500,
                fontSize: 14,
                cursor: locatingHome ? "default" : "pointer",
              }}
            >
              {locatingHome ? (
                <>
                  <LoaderCircle size={16} className="spin-icon" /> 위치 확인 중
                </>
              ) : (
                <>
                  <Crosshair size={16} /> 현재 위치로 찾기 (GPS)
                </>
              )}
            </button>

            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                type="text"
                value={manualAddress}
                onChange={(event) => setManualAddress(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleManualAddressSubmit();
                }}
                placeholder="주소를 직접 입력 (예: 성동구 성수이로 20)"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "12px 12px",
                  borderRadius: 4,
                  border: `1px solid ${TOKENS.colors.borderLight}`,
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={handleManualAddressSubmit}
                disabled={!manualAddress.trim()}
                style={{
                  padding: "0 16px",
                  borderRadius: 4,
                  border: "none",
                  background: manualAddress.trim()
                    ? TOKENS.colors.navy
                    : TOKENS.colors.borderLight,
                  color: "#ffffff",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: manualAddress.trim() ? "pointer" : "not-allowed",
                }}
              >
                설정
              </button>
            </div>
            {homeLocateError && (
              <p style={{ margin: "0 0 14px", color: "#e53935", fontSize: 12 }}>
                {homeLocateError}
              </p>
            )}

            <p
              style={{
                margin: homeLocateError ? "0 0 10px" : "14px 0 10px",
                fontSize: 12,
                color: TOKENS.colors.textSubtle,
              }}
            >
              또는 자주 찾는 동네에서 선택
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["성수동 1가", "성수동 2가", "자양동", "화양동"].map((dong) => (
                <button
                  key={dong}
                  onClick={() => {
                    setCurrentLocation(dong);
                    setIsLocationModalOpen(false);
                    showToast(`기준 동네가 [${dong}]로 설정되었습니다.`);
                  }}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 4,
                    border: `1px solid ${currentLocation === dong ? TOKENS.colors.primaryOrange : TOKENS.colors.borderLight}`,
                    background:
                      currentLocation === dong
                        ? TOKENS.colors.primaryLight
                        : "#ffffff",
                    color:
                      currentLocation === dong
                        ? TOKENS.colors.primaryOrange
                        : "#333333",
                    fontWeight: currentLocation === dong ? 500 : 400,
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {dong} {currentLocation === dong && "✓"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
