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
import { useLocationStore } from "@/shared/location/LocationContext";
import { useLargeText } from "@/shared/hooks/useLargeText";
import { getRecentCategories } from "@/lib/recent-categories";
import { ProductCard } from "@/shared/components/ProductCard";
import { CATEGORY_GROUPS, THEME_ROUTE, isMorningPick } from "@/shared/categoryData";
import { getCatalog } from "@/shared/services/catalog";
import { discountPercentOf, formatPrice as formatDealPrice, type Product } from "@/shared/catalog";
import { getCart, getMyNotifications, getPopularSearchTerms, getReopenRequestCount, getWishlistIds, logSearchTerm, markAllNotificationsRead, markNotificationRead, toggleReopenRequest, toggleWishlist, type RawRecord } from "@/lib/api";

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

// ── 히어로 배너 데이터 ──
const HERO_SLIDES = [
  {
    id: "1",
    tag: "",
    title: "신선함을 먼저 생각하는 \n우리 동네 타임딜",
    desc: "성수동 소상공인 마감 재고 최대 70% 타임딜 오픈!\n이웃들과 함께 모여 확정 할인가로 당일 픽업하세요.",
    // 신선한 과일·채소가 가득한 로컬 마켓/장보기 이미지
    img: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "5",
    tag: "",
    title: "갓 구운 빵을\n오늘 바로 반값에",
    desc: "성수 명품 베이커리 당일 식빵·소금빵 반값 할인!\n골든 타임 한정으로 갓 구운 풍미 그대로 만납니다.",
    // 갓 구워진 윤기 나는 크루아상·소금빵·식빵 베이커리 이미지
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "2",
    tag: "",
    title: "퇴근길 도보 5분,\n우리 동네 픽업 특가",
    desc: "도보 5분 내 매장 픽업 퇴근길 전 품목 균일가 특가!\n동네 이웃과 함께 바로 픽업하는 초간편 공구.",
    // 퇴근길 픽업하기 좋은 정갈한 포장 요리 및 델리 박스 이미지
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "4",
    tag: "",
    title: "오늘 아침 산란,\n특란 30구 신선특가",
    desc: "당일 산란한 신선란만 골라 담은 타임딜!\n아침 든든하게 채우는 신선식품을 지금 만나보세요.",
    // 신선한 갈색 달걀/신선란 트레이 이미지
    img: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=1600&q=80](https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "9",
    tag: "",
    title: "친환경 제철 야채,\n오늘만 이 가격",
    desc: "산지에서 바로 온 친환경 방울토마토 타임딜!\n건강한 한 끼를 동네 이웃과 함께 나눠보세요.",
    // 산지직송 느낌의 싱싱한 완숙 방울토마토 및 야채 이미지
    img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1600&q=80",
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

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = authClient.useSession();
  const { enabled: largeText, toggle: toggleLargeText } = useLargeText();

  // ── 모닝픽 배너 + 개인화 추천에 쓸 실제 상품 목록 ──
  const [morningPick, setMorningPick] = useState<Product | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  useEffect(() => {
    let active = true;
    void getCatalog().then((result) => {
      if (!active) return;
      setMorningPick(result.products.find(isMorningPick) ?? null);
      setCatalogProducts(result.products);
    });
    return () => { active = false; };
  }, []);

  // ── 최근 본 카테고리 기반 개인화 추천 ──
  const recommendedProducts = useMemo(() => {
    const recentCategories = getRecentCategories(3);
    if (recentCategories.length === 0) return [];
    return catalogProducts.filter((item) => recentCategories.includes(item.category)).slice(0, 4);
  }, [catalogProducts]);

  // ── 실제 찜(위시리스트) 상태 ──
  useEffect(() => {
    if (!session?.user) { setWishlistIds(new Set()); return; }
    let active = true;
    void getWishlistIds().then((result) => { if (active && result.ok) setWishlistIds(new Set(result.data?.productIds ?? [])); });
    return () => { active = false; };
  }, [session?.user]);
  const handleToggleWishlist = async (productId: string) => {
    if (!session?.user) { navigate("/auth"); return; }
    const wasLiked = wishlistIds.has(productId);
    setWishlistIds((prev) => { const next = new Set(prev); if (wasLiked) next.delete(productId); else next.add(productId); return next; });
    const result = await toggleWishlist(productId);
    if (!result.ok) setWishlistIds((prev) => { const next = new Set(prev); if (wasLiked) next.add(productId); else next.delete(productId); return next; });
  };

  // ── 장바구니 개수 및 알림 센터(실제 API) ──
  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState<RawRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  useEffect(() => {
    if (!session?.user) { setCartCount(0); setNotifications([]); setUnreadCount(0); return; }
    let active = true;
    const refresh = () => {
      void getCart({ silent: true }).then((result) => { if (active && result.ok) setCartCount((result.data?.items ?? []).length); });
      void getMyNotifications({ silent: true }).then((result) => { if (active && result.ok) { setNotifications(result.data?.notifications ?? []); setUnreadCount(result.data?.unreadCount ?? 0); } });
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [session?.user]);
  const openNotification = async (item: RawRecord) => {
    setIsNotifOpen(false);
    if (!item.read_at) {
      await markNotificationRead(String(item.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) => prev.map((row) => (row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)));
    }
    if (item.link) navigate(String(item.link));
  };
  const readAllNotifications = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((row) => ({ ...row, read_at: row.read_at ?? new Date().toISOString() })));
  };

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
  const [manualAddress, setManualAddress] = useState("");
  const { currentLocation, recentLocations, locating: locatingHome, error: homeLocateError, locateByGps, setManualLocation, selectRecent, clearError } = useLocationStore();

  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [reopenStats, setReopenStats] = useState<Record<string, { count: number; requested: boolean }>>({});

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

  const RANKING_TABS = useMemo(() => ["전체", ...Object.keys(CATEGORY_GROUPS)].slice(0, 6), []);

  // ── 검색어 순위 (실제 검색 데이터가 쌓이면 그걸로 대체) ──
  const [popularTerms, setPopularTerms] = useState<string[]>(POPULAR_SEARCH_KEYWORDS);
  useEffect(() => {
    void getPopularSearchTerms().then((result) => {
      if (result.ok && result.data && result.data.terms.length > 0) setPopularTerms(result.data.terms);
    });
  }, []);
  const searchSuggestions = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      return popularTerms.slice(0, 10);
    }
    const matched = popularTerms.filter((kw) =>
      kw.toLowerCase().includes(trimmed),
    );
    return matched.length > 0 ? matched.slice(0, 10) : [trimmed];
  }, [searchTerm, popularTerms]);

  // ── 검색 실행 함수 (엔터 / 클릭 공통) ──
  const executeSearch = (keyword: string) => {
    const target = keyword.trim();
    if (!target) return;
    setIsSearchFocused(false);
    void logSearchTerm(target);
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

  const handleLocateHome = async () => {
    const label = await locateByGps();
    if (label) {
      setIsLocationModalOpen(false);
      showToast(`기준 동네가 [${label}]로 설정되었습니다.`);
    }
  };

  const handleManualAddressSubmit = () => {
    const label = setManualLocation(manualAddress);
    if (!label) return;
    setManualAddress("");
    setIsLocationModalOpen(false);
    showToast(`기준 동네가 [${label}]로 설정되었습니다.`);
  };

  const handleSelectRecentLocation = (entry: (typeof recentLocations)[number]) => {
    selectRecent(entry);
    setIsLocationModalOpen(false);
    showToast(`기준 동네가 [${entry.label}]로 설정되었습니다.`);
  };

  // ── 재오픈 요청 후보(참여율이 목표에 가장 가까운 실제 딜) 및 실제 요청 집계 ──
  const reopenCandidates = useMemo(() => {
    return [...catalogProducts]
      .filter((item) => item.target > 0)
      .sort((a, b) => (b.participants / b.target) - (a.participants / a.target))
      .slice(0, 4);
  }, [catalogProducts]);
  useEffect(() => {
    if (reopenCandidates.length === 0) return;
    let active = true;
    void Promise.all(reopenCandidates.map((item) => getReopenRequestCount(item.id).then((result) => [item.id, result] as const))).then((entries) => {
      if (!active) return;
      setReopenStats((prev) => {
        const next = { ...prev };
        for (const [id, result] of entries) if (result.ok && result.data) next[id] = { count: result.data.count, requested: next[id]?.requested ?? false };
        return next;
      });
    });
    return () => { active = false; };
  }, [reopenCandidates]);
  const toggleReopenVote = async (e: React.MouseEvent, productId: string, name: string) => {
    e.stopPropagation();
    if (!session?.user) { navigate("/auth"); return; }
    const result = await toggleReopenRequest(productId);
    if (!result.ok || !result.data) return;
    setReopenStats((prev) => ({ ...prev, [productId]: { count: result.data!.count, requested: result.data!.requested } }));
    showToast(result.data.requested ? `🔔 [${name}] 재오픈 알림 요청이 완료되었습니다!` : `[${name}] 재오픈 요청이 취소되었습니다.`);
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

  const rankingItems = useMemo(() => [...catalogProducts].sort((a, b) => b.participants - a.participants).slice(0, 10), [catalogProducts]);
  const walkPicks = useMemo(() => [...catalogProducts].sort((a, b) => discountPercentOf(b) - discountPercentOf(a)).slice(0, 8), [catalogProducts]);
  const reorderPicks = useMemo(() => [...catalogProducts].sort((a, b) => a.dealPrice - b.dealPrice).slice(0, 4), [catalogProducts]);

  const categoryRankingItems = useMemo(() => {
    if (rankingCategoryTab === "전체") {
      return [...catalogProducts].sort((a, b) => b.participants - a.participants).slice(0, 9);
    }
    const matched = catalogProducts.filter((item) => item.category === rankingCategoryTab);
    return (matched.length > 0 ? matched : catalogProducts).slice(0, 9);
  }, [rankingCategoryTab, catalogProducts]);

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
        <span
          style={{ cursor: "pointer", color: largeText ? TOKENS.colors.primaryOrange : "#333333", fontWeight: largeText ? 700 : 400 }}
          onClick={toggleLargeText}
          title="큰 글씨 모드"
        >
          가 큰글씨
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
            onClick={() => navigate("/mypage/wishlist")}
            title="찜한 상품"
          >
            <Heart
              size={24}
              strokeWidth={1.5}
              color={
                wishlistIds.size > 0
                  ? TOKENS.colors.primaryOrange
                  : TOKENS.colors.navy
              }
              fill={wishlistIds.size > 0 ? TOKENS.colors.primaryOrange : "none"}
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
            onClick={() => navigate("/cart")}
            title="장바구니"
          >
            <ShoppingCart
              size={24}
              strokeWidth={1.5}
              color={TOKENS.colors.navy}
            />
            {cartCount > 0 && (
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
                {cartCount}
              </span>
            )}
          </div>
          {session?.user && (
            <div style={{ position: "relative" }} onMouseEnter={() => setIsNotifOpen(true)} onMouseLeave={() => setIsNotifOpen(false)}>
              <div style={{ width: 36, height: 36, position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="알림">
                <BellRing size={24} strokeWidth={1.5} color={TOKENS.colors.navy} />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 0, right: -2, background: TOKENS.colors.primaryOrange, color: "#ffffff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              {isNotifOpen && (
                <div style={{ position: "absolute", top: 36, right: 0, width: 320, maxHeight: 400, overflowY: "auto", background: "#ffffff", border: `1px solid ${TOKENS.colors.borderMedium}`, boxShadow: TOKENS.shadows.floating, borderRadius: 8, zIndex: 210 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${TOKENS.colors.borderLight}` }}>
                    <strong style={{ fontSize: 13 }}>알림</strong>
                    {unreadCount > 0 && <span style={{ fontSize: 12, color: TOKENS.colors.primaryOrange, cursor: "pointer" }} onClick={() => void readAllNotifications()}>모두 읽음</span>}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "24px 14px", fontSize: 13, color: TOKENS.colors.textSubtle, textAlign: "center" }}>알림이 없습니다.</div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={String(item.id)}
                        onClick={() => void openNotification(item)}
                        style={{ padding: "10px 14px", borderBottom: `1px solid ${TOKENS.colors.borderLight}`, cursor: "pointer", background: item.read_at ? "#ffffff" : "#fff8f6" }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>{String(item.title)}</div>
                        <div style={{ fontSize: 12, color: TOKENS.colors.textSubtle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(item.body ?? "")}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
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
                    {Object.keys(CATEGORY_GROUPS).map((catName) => (
                      <div
                        key={catName}
                        onMouseEnter={() => setHoveredCategory(catName)}
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          navigate(`/products?category=${encodeURIComponent(catName)}`);
                        }}
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
                      onClick={() => {
                        setIsCategoryMenuOpen(false);
                        navigate(`/products?category=${encodeURIComponent(hoveredCategory)}`);
                      }}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: TOKENS.colors.textSubtle,
                        marginBottom: 4,
                        borderBottom: `1px solid ${TOKENS.colors.borderLight}`,
                        paddingBottom: 6,
                        cursor: "pointer",
                      }}
                    >
                      {hoveredCategory} 전체보기
                    </div>
                    {CATEGORY_GROUPS[hoveredCategory]?.map((subItem) => (
                      <div
                        key={subItem}
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          navigate(`/products?category=${encodeURIComponent(hoveredCategory)}&sub=${encodeURIComponent(subItem)}`);
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
                minWidth: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ul
                ref={navScrollRef}
                onScroll={handleNavScrollCheck}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 38,
                  listStyle: "none",
                  margin: 0,
                  marginLeft: 48,
                  padding: 0,
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  maxWidth: "100%",
                  scrollBehavior: "smooth",
                }}
              >
                {MAIN_NAV_THEMES.map((tab) => {
                  const isSelected = selectedCategory === tab;
                  return (
                    <li key={tab} style={{ flexShrink: 0, display: "flex" }}>
                      <span
                        onClick={() => handleNavThemeClick(tab)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 36,
                          padding: "0 4px",
                          borderRadius: 18,
                          fontSize: 15,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? TOKENS.colors.primaryOrange : "#333333",
                          background: isSelected ? TOKENS.colors.primaryLight : "transparent",
                          cursor: "pointer",
                          letterSpacing: "-0.3px",
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap",
                          boxSizing: "border-box",
                        }}
                      >
                        {tab}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

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
          borderRadius: 0,
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
              {(() => {
                const orderPath = morningPick ? `/products/${morningPick.id}` : "/products?theme=morning";
                return (
                <div
                  onClick={() => navigate(orderPath)}
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
                      src={morningPick?.image ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80"}
                      alt={morningPick?.name ?? "신선한 샐러드"}
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
                      상쾌한 아침을 여는 신선 모닝픽 상품
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
                      {morningPick ? morningPick.name : "[모닝특가] 신선 유기농 아침 샐러드 & 그래놀라 세트"}
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
                        {morningPick ? `${discountPercentOf(morningPick)}%` : "35%"}
                      </strong>
                      <strong
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: TOKENS.colors.textHeading,
                        }}
                      >
                        {morningPick ? formatDealPrice(morningPick.dealPrice) : "6,500원"}
                      </strong>
                      <del
                        style={{ fontSize: 14, color: TOKENS.colors.textSubtle }}
                      >
                        {morningPick ? formatDealPrice(morningPick.originalPrice) : "9,800원"}
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
                );
              })()}
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
                      {discountPercentOf(item)}% OFF
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
                          {formatDealPrice(item.originalPrice)}
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
                          {discountPercentOf(item)}%
                        </strong>
                        <strong
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: TOKENS.colors.textHeading,
                          }}
                        >
                          {formatDealPrice(item.dealPrice)}
                        </strong>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: TOKENS.colors.textSubtle,
                          marginTop: 4,
                        }}
                      >
                        🔥 {item.participants}명 참여중
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
                    rankingCategoryTab === cat
                      ? TOKENS.colors.navy
                      : "#ffffff",
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
                        {formatDealPrice(item.originalPrice)}
                      </del>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                      }}
                    >
                      {discountPercentOf(item) > 0 && (
                        <strong
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: TOKENS.colors.primaryOrange,
                          }}
                        >
                          {discountPercentOf(item)}%
                        </strong>
                      )}
                      <strong
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: TOKENS.colors.textHeading,
                        }}
                      >
                        {formatDealPrice(item.dealPrice)}
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
              {walkPicks.map((item) => (
                <div
                  key={`${item.id}-${item.dealId ?? "walk"}`}
                  style={{
                    flex: "0 0 calc((100% - 60px) / 4)",
                    minWidth: 236,
                  }}
                >
                  <ProductCard product={item} isWishlisted={wishlistIds.has(item.id)} onToggleWishlist={session?.user ? handleToggleWishlist : undefined} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 최근 본 카테고리 기반 개인화 추천 */}
        {recommendedProducts.length > 0 && (
          <section style={{ marginBottom: 80 }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: TOKENS.colors.primaryOrange, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                회원님을 위한 추천
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: TOKENS.colors.textHeading, margin: 0 }}>
                최근 관심 있게 보신 카테고리의 마감특가예요
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 20 }}>
              {recommendedProducts.map((item) => (
                <ProductCard key={`${item.id}-${item.dealId ?? "catalog"}`} product={item} />
              ))}
            </div>
          </section>
        )}

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
목표 수량에 가장 가까운 인기 타임딜이에요. 요청이 모이면 사장님께
              추가 오픈 요청이 전달돼요!
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
              {reopenCandidates.map((item) => {
                const stats = reopenStats[item.id];
                const isVoted = stats?.requested ?? false;

                return (
                  <div
                    key={`${item.id}-${item.dealId ?? "reopen"}`}
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
                    onClick={(e) => void toggleReopenVote(e, item.id, item.name)}
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
                        <span
                          style={{
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 700,
                            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                            letterSpacing: "-0.2px",
                          }}
                        >
                          #{item.category}
                        </span>
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
                            지금 {item.participants}명이 함께하고 있는 인기 타임딜이에요
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleReopenVote(e, item.id, item.name);
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
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 6,
                          }}
                        >
                          <strong
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: TOKENS.colors.textHeading,
                            }}
                          >
                            {formatDealPrice(item.dealPrice)}
                          </strong>
                          {item.originalPrice > item.dealPrice && (
                            <del
                              style={{
                                fontSize: 13,
                                color: TOKENS.colors.textSubtle,
                              }}
                            >
                              {formatDealPrice(item.originalPrice)}
                            </del>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: TOKENS.colors.primaryOrange,
                          }}
                        >
                          {stats?.count ?? 0}명 재오픈 요청
                        </span>
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
              💜 지금 가장 가성비 좋은 인기템
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
            {reorderPicks.map((item) => (
                <div
                  key={`${item.id}-${item.dealId ?? "reorder"}`}
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
                      최대 {discountPercentOf(item)}% 할인
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
                        {discountPercentOf(item)}%
                      </strong>
                      <strong
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: TOKENS.colors.textHeading,
                        }}
                      >
                        {formatDealPrice(item.dealPrice)}
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
              justifyContent: "flex-end",
              gap: 4,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            {[
              { label: "판매자 센터", to: "/seller" },
              { label: "관리자 콘솔", to: "/admin" },
              { label: "고객센터", to: "/notices" },
            ].map((item, idx, arr) => (
              <span key={item.label} style={{ display: "flex", alignItems: "center" }}>
                <span
                  onClick={() => navigate(item.to)}
                  style={{
                    cursor: "pointer",
                    color: TOKENS.colors.textBody,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
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
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            {[
              { label: "회사소개", to: "/about" },
              { label: "이용약관", to: "/terms" },
              { label: "개인정보처리방침", to: "/privacy" },
              { label: "이메일무단수집거부", to: "/email-policy" },
              { label: "고객센터", to: "/notices" },
            ].map((item, idx, arr) => (
              <span
                key={item.label}
                style={{ display: "flex", alignItems: "center" }}
              >
                <span
                  onClick={() => navigate(item.to)}
                  style={{
                    cursor: "pointer",
                    color:
                      item.label === "개인정보처리방침"
                        ? TOKENS.colors.textHeading
                        : TOKENS.colors.textMuted,
                    fontWeight: item.label === "개인정보처리방침" ? 600 : 400,
                  }}
                >
                  {item.label}
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
              · 팀: 연리 엄태훈 최다울 이동교
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
                onClick={() => { setIsLocationModalOpen(false); clearError(); }}
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
              onClick={() => void handleLocateHome()}
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
              {(recentLocations.length > 0
                ? recentLocations
                : (["성수동 1가", "성수동 2가", "자양동", "화양동"] as const).map((label) => ({ label, neighborhood: label, coords: null }))
              ).map((entry) => (
                <button
                  key={entry.label}
                  onClick={() => handleSelectRecentLocation(entry)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 4,
                    border: `1px solid ${currentLocation === entry.label ? TOKENS.colors.primaryOrange : TOKENS.colors.borderLight}`,
                    background:
                      currentLocation === entry.label
                        ? TOKENS.colors.primaryLight
                        : "#ffffff",
                    color:
                      currentLocation === entry.label
                        ? TOKENS.colors.primaryOrange
                        : "#333333",
                    fontWeight: currentLocation === entry.label ? 500 : 400,
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {entry.neighborhood ?? entry.label} {currentLocation === entry.label && "✓"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}