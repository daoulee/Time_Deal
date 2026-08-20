import { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Footprints,
  Heart,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  X,
  Zap,
  BellRing,
  Flame,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// ── 슬라이드별 사진 데이터 (배경색은 더 이상 쓰지 않고 사진을 풀블리드 배경으로 사용) ──
const HERO_SLIDES = [
  {
    id: "1",
    tag: "🔥 게릴라 플래시 딜",
    title: "The fresh time-deal\nputs quality first",
    desc: "성수동 소상공인 마감 재고 최대 70% 타임딜 오픈!\n이웃들과 함께 모여 확정 할인가로 당일 픽업하세요.",
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "5",
    tag: "🍞 갓 구운 빵 당일 소진전",
    title: "Fresh bakery deals\nstraight from the oven",
    desc: "성수 명품 베이커리 당일 식빵·소금빵 반값 할인!\n골든 타임 한정으로 갓 구운 풍미 그대로 만납니다.",
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "2",
    tag: "⚡ 18:00 퇴근길 골든타임",
    title: "Hyperlocal pickup\non your way home",
    desc: "도보 5분 내 매장 픽업 퇴근길 전 품목 균일가 특가!\n동네 이웃과 함께 바로 픽업하는 초간편 공구.",
    img: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1600&q=80",
  },
];

const TOKENS = {
  colors: {
    navy: "#0f3460",
    navyDark: "#09203f",
    navyLight: "#16457d",
    primaryOrange: "#ff5722",
    primaryOrangeHover: "#e64a19",
    primaryLight: "#fff5f2",
    canvas: "#ffffff",
    bgMuted: "#f7f9fa",
    textHeading: "#0f3460",
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
    cardHover: "0 8px 24px rgba(15, 52, 96, 0.12)",
    floating: "0 16px 40px rgba(0, 0, 0, 0.12)",
  },
};

const CATEGORIES = [
  "전체",
  "생활용품",
  "신선식품",
  "베이커리",
  "과일·야채",
  "음식·반찬",
];

const LIVE_FEEDS = [
  { user: "성수동 이*교", item: "성수 수제 함박스테이크", time: "방금 전" },
  { user: "자양동 김*수", item: "버터 소금빵 4구", time: "1분 전" },
  { user: "화양동 박*연", item: "도톰한 화장지 32롤", time: "3분 전" },
  { user: "성수동 최*훈", item: "산지직송 논산 딸기 2팩", time: "5분 전" },
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
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1582722872446-47e2ef309252?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80",
    deadline: "오늘 마감",
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("성수동 2가");

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTopBannerOpen, setIsTopBannerOpen] = useState(true);

  // 히어로 슬라이더 자동 롤링
  useEffect(() => {
    const bannerTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(bannerTimer);
  }, []);

  // 실시간 주문 피드 롤링
  useEffect(() => {
    const feedTimer = setInterval(() => {
      setCurrentFeedIndex((prev) => (prev + 1) % LIVE_FEEDS.length);
    }, 3200);
    return () => clearInterval(feedTimer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
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

  const formatPrice = (price: number) => {
    return price.toLocaleString("ko-KR") + "원";
  };

  const filteredProducts = useMemo(() => {
    let result = [...PRODUCTS_DATA];
    if (selectedCategory !== "전체") {
      result = result.filter(
        (item) =>
          item.category.includes(selectedCategory) ||
          item.name.includes(selectedCategory),
      );
      if (result.length === 0) result = PRODUCTS_DATA;
    }
    if (searchTerm.trim()) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    return result;
  }, [selectedCategory, searchTerm]);

  const activeHero = HERO_SLIDES[currentHeroIndex];

  const renderProductCard = (item: DealProduct) => {
    return (
      <article
        key={item.id}
        onClick={() => navigate(`/products/${item.id}`)}
        style={{
          background: "#ffffff",
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${TOKENS.colors.borderLight}`,
          boxShadow: TOKENS.shadows.card,
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 240,
            position: "relative",
            background: "#f4f4f4",
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
              top: 12,
              left: 12,
              background: TOKENS.colors.badgeDiscount,
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              padding: "4px 8px",
              borderRadius: 4,
            }}
          >
            {item.discountRate}% OFF
          </span>
          <button
            onClick={(e) => toggleLike(e, item.id)}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(255,255,255,0.85)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Heart
              size={16}
              color={
                likedIds.has(item.id) ? TOKENS.colors.primaryOrange : "#888888"
              }
              fill={likedIds.has(item.id) ? TOKENS.colors.primaryOrange : "none"}
            />
          </button>
        </div>

        <div style={{ padding: "16px 18px 18px" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: TOKENS.colors.primaryOrange,
              marginBottom: 4,
            }}
          >
            {item.category}
          </div>

          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: TOKENS.colors.textHeading,
              margin: "0 0 10px 0",
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
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <strong
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: TOKENS.colors.textHeading,
                }}
              >
                {formatPrice(item.dealPrice)}
              </strong>
              <del
                style={{
                  fontSize: 13,
                  color: TOKENS.colors.textSubtle,
                }}
              >
                {formatPrice(item.originalPrice)}
              </del>
            </div>
            <span style={{ fontSize: 12, color: TOKENS.colors.textMuted }}>
              {item.deadline}
            </span>
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
            backgroundColor: "rgba(15, 52, 96, 0.95)",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: 30,
            fontSize: 14,
            fontWeight: 600,
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

      {/* ── 1. 최상단 띠 배너 ── */}
      {isTopBannerOpen && (
        <aside
          style={{
            width: "100%",
            background: TOKENS.colors.primaryOrange,
            color: "#ffffff",
            height: 42,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            zIndex: 100,
          }}
          onClick={() => showToast("🎉 3,000원 웰컴 쿠폰이 다운로드되었습니다!")}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1050,
              margin: "0 auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
              padding: "0 16px",
              boxSizing: "border-box",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.3px",
            }}
          >
            <span>
              지금 가입하고 <b>최대 1만 2천원 할인 쿠폰</b> 받아가세요!
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsTopBannerOpen(false);
              }}
              style={{
                position: "absolute",
                right: 16,
                background: "none",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </aside>
      )}

      {/* ── 2. 유틸리티 바 ── */}
      <div
        style={{
          width: "100%",
          maxWidth: 1050,
          margin: "0 auto",
          padding: "10px 16px 0",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          fontSize: 12,
          letterSpacing: "-0.3px",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            cursor: "pointer",
            color: TOKENS.colors.primaryOrange,
            fontWeight: 500,
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
          onClick={() => navigate("/inquiry")}
        >
          고객센터 ▾
        </span>
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
            <img src="/images/deal-logo.png" alt="타임딜" style={{ height: 30, width: "auto", display: "block" }} />
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 16,
              fontWeight: 700,
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
              }}
              onClick={() => navigate("/community")}
            >
              동네공구
            </span>
          </div>
        </div>

        <div
          style={{
            width: 400,
            height: 44,
            border: `1.5px solid ${TOKENS.colors.navy}`,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            background: "#ffffff",
            position: "relative",
          }}
        >
          <input
            type="text"
            placeholder="마감 임박 신선식품, 계란, 샐러드 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              onClick={() => setSearchTerm("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: TOKENS.colors.textSubtle,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={18} />
            </button>
          ) : (
            <Search size={22} color={TOKENS.colors.navy} />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 36,
              height: 36,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setIsLocationModalOpen(true)}
            title="배송지/동네 설정"
          >
            <MapPin size={24} strokeWidth={1.5} color={TOKENS.colors.navy} />
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
              color={likedIds.size > 0 ? TOKENS.colors.primaryOrange : TOKENS.colors.navy}
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
            <ShoppingCart size={24} strokeWidth={1.5} color={TOKENS.colors.navy} />
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
                  fontWeight: 700,
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
          borderBottom: `1px solid ${TOKENS.colors.borderLight}`,
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1050,
            margin: "0 auto",
            height: 56,
            display: "flex",
            alignItems: "center",
            position: "relative",
            padding: "0 16px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: 82,
              height: 44,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              color: "#333333",
              flexShrink: 0,
            }}
            onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
          >
            <Menu size={16} strokeWidth={2} />
            <span>카테고리</span>
          </div>

          <ul
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              gap: 12,
              listStyle: "none",
              margin: 0,
              padding: 0,
              alignItems: "center",
            }}
          >
            {["베스트", "골든타임", "당일마감", "신규오픈", "특가/공구"].map(
              (tab, idx) => {
                const isSelected =
                  selectedCategory === CATEGORIES[idx] ||
                  (idx === 0 && selectedCategory === "전체");
                return (
                  <li key={tab}>
                    <span
                      onClick={() => {
                        setSelectedCategory(CATEGORIES[idx] || "전체");
                        setSearchTerm("");
                      }}
                      style={{
                        display: "inline-block",
                        padding: "0 20px",
                        fontSize: 16,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? TOKENS.colors.primaryOrange : "#333333",
                        cursor: "pointer",
                        letterSpacing: "-0.3px",
                        lineHeight: "56px",
                      }}
                    >
                      {tab}
                    </span>
                  </li>
                  );
                },
              )}
          </ul>

          <div
            onClick={() => setIsLocationModalOpen(true)}
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              border: `1px solid ${TOKENS.colors.borderMedium}`,
              borderRadius: 18,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#666666",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: TOKENS.colors.primaryOrange, fontWeight: 700 }}>
              {currentLocation}
            </span>{" "}
            당일 픽업안내
          </div>

          {isCategoryMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 56,
                left: 16,
                width: 200,
                background: "#ffffff",
                border: `1px solid ${TOKENS.colors.borderMedium}`,
                boxShadow: TOKENS.shadows.floating,
                zIndex: 100,
                padding: "8px 0",
              }}
            >
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsCategoryMenuOpen(false);
                  }}
                  style={{
                    padding: "10px 18px",
                    fontSize: 14,
                    color:
                      selectedCategory === cat
                        ? TOKENS.colors.primaryOrange
                        : "#333333",
                    fontWeight: selectedCategory === cat ? 700 : 400,
                    cursor: "pointer",
                    background:
                      selectedCategory === cat
                        ? TOKENS.colors.primaryLight
                        : "transparent",
                  }}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* ── 5. 사진 풀블리드 히어로 배너 (배경색 제거, 사진이 섹션 전체를 채움) ── */}
      <section
        style={{
          width: "100vw",
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)",
          height: 460,
          overflow: "hidden",
          marginBottom: 48,
        }}
      >
        {/* 풀블리드 사진 배경 */}
        <img
          src={activeHero.img}
          alt={activeHero.title}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.5s ease",
          }}
        />
        {/* 좌측 텍스트 가독성을 위한 그라데이션 오버레이 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(9,32,63,0.72) 0%, rgba(9,32,63,0.42) 45%, rgba(9,32,63,0.05) 75%, rgba(9,32,63,0) 100%)",
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
          {/* 텍스트 카피 & CTA (사진 위 오버레이) */}
          <div style={{ maxWidth: 470, zIndex: 2 }}>
            <span
              style={{
                fontSize: 14,
                color: "#ffb199",
                fontWeight: 800,
                letterSpacing: "0.5px",
                display: "inline-block",
                marginBottom: 8,
              }}
            >
              {activeHero.tag}
            </span>
            <h1
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: "1.18",
                margin: "0 0 14px 0",
                letterSpacing: "-1px",
                whiteSpace: "pre-line",
                textShadow: "0 2px 12px rgba(0,0,0,0.25)",
              }}
            >
              {activeHero.title}
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.88)",
                lineHeight: "1.5",
                margin: "0 0 28px 0",
                fontWeight: 500,
                whiteSpace: "pre-line",
              }}
            >
              {activeHero.desc}
            </p>

            <button
              onClick={() => navigate(`/products/${activeHero.id}`)}
              style={{
                backgroundColor: TOKENS.colors.navy,
                color: "#ffffff",
                border: "none",
                borderRadius: 30,
                padding: "14px 34px",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.8px",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(15,52,96,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = TOKENS.colors.navyDark)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = TOKENS.colors.navy)
              }
            >
              GET SPECIAL DEAL NOW
            </button>
          </div>
        </div>

        {/* 페이지네이션 인디케이터 (섹션 우측 하단) */}
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
            fontWeight: 500,
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

        {/* 좌우 넘김 버튼 */}
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
        {/* [라이브 피드] 실시간 주문 롤링 */}
        <section
          style={{
            marginBottom: 56,
            background: "#ffffff",
            border: `1.5px solid ${TOKENS.colors.navy}`,
            borderRadius: 6,
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: TOKENS.shadows.card,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                background: TOKENS.colors.primaryOrange,
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Zap size={13} fill="#fff" /> 실시간 공구
            </span>
            <span style={{ fontSize: 14, color: TOKENS.colors.textBody }}>
              <b>{LIVE_FEEDS[currentFeedIndex].user}</b>님이{" "}
              <b>[{LIVE_FEEDS[currentFeedIndex].item}]</b> 예약을 완료했습니다!{" "}
              <span style={{ color: "#999" }}>
                ({LIVE_FEEDS[currentFeedIndex].time})
              </span>
            </span>
          </div>
          <Link
            to="/community"
            style={{
              fontSize: 13,
              color: TOKENS.colors.primaryOrange,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            실시간 피드 &gt;
          </Link>
        </section>

        {/* [섹션 1] 마감 임박 딜 */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                margin: "0 0 8px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: TOKENS.colors.navy,
              }}
            >
              <Flame size={24} color={TOKENS.colors.primaryOrange} /> 마감 임박! 추천 타임딜 &gt;
            </h2>
            <p style={{ fontSize: 15, color: TOKENS.colors.textSubtle, margin: 0 }}>
              오늘 놓치면 아쉬운 성수동 골목 소상공인 마감 할인
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            {filteredProducts.slice(0, 3).map((item) => renderProductCard(item))}
          </div>
        </section>

        {/* [섹션 2] 베이커리 & 신선식품 */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                margin: "0 0 8px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: TOKENS.colors.navy,
              }}
            >
              🍞 오늘 구워 오늘 소진! 당일 베이커리 & 식품 &gt;
            </h2>
            <p style={{ fontSize: 15, color: TOKENS.colors.textSubtle, margin: 0 }}>
              신선함을 위해 매일 저녁 정해진 수량만 특가 판매합니다
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            {filteredProducts.slice(3, 6).map((item) => renderProductCard(item))}
          </div>
        </section>

        {/* [섹션 3] 도보 거리 퇴근길 픽업 */}
        <section style={{ marginBottom: 80 }}>
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
                  fontWeight: 700,
                  margin: "0 0 6px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: TOKENS.colors.navy,
                }}
              >
                <Footprints size={22} color={TOKENS.colors.primaryOrange} /> 걸어서 5분
                거리! 퇴근길 픽업 특가
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
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                color: TOKENS.colors.navy,
                cursor: "pointer",
              }}
            >
              지도에서 찾기 📍
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            {filteredProducts.slice(0, 3).map((item) => renderProductCard(item))}
          </div>
        </section>
      </main>

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
                  fontWeight: 700,
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
                    fontWeight: currentLocation === dong ? 700 : 500,
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
