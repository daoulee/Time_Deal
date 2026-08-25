/**
 * 홈 화면과 동일한 디자인의 상단바(로고·검색·연관검색어 팝오버·카테고리·동네 설정)를 상품 목록 페이지 등에서 재사용합니다.
 * 카테고리 소분류와 상단 테마 탭(베스트/골든타임 등)을 누르면 실제 URL 이동으로 연결됩니다.
 * 홈 화면과 동일한 10개 연관 검색어 레이어가 탑재되어 있습니다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronRight,
  Crosshair,
  Heart,
  LoaderCircle,
  Menu,
  MapPin,
  Search,
  ShoppingCart,
  X,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";
import { useLocationStore } from "@/shared/location/LocationContext";
import { useLargeText } from "@/shared/hooks/useLargeText";
import { CATEGORY_GROUPS, THEME_ROUTE, type ThemeKey } from "@/shared/categoryData";
import { getCart, getMyNotifications, getPopularSearchTerms, logSearchTerm, markAllNotificationsRead, markNotificationRead, type RawRecord } from "@/lib/api";

const TOKENS = {
  navy: "#1a1a1a",
  primaryOrange: "#ff5722",
  primaryLight: "#fff5f2",
  textSubtle: "#999999",
  borderLight: "#e2e8f0",
  borderMedium: "#cbd5e1",
  borderDivider: "#d9d9d9",
  floatingShadow: "0 16px 40px rgba(0, 0, 0, 0.15)",
};

// ── 성수동 실제 맛집 기반 10개 추천 검색어 리스트 ──
const POPULAR_SEARCH_KEYWORDS = [
  "밀도",
  "소금빵",
  "감자탕",
  "어니언",
  "제스티살룬",
  "베이글",
  "난포",
  "삼겹살",
  "딸기",
  "카츠성수",
];

const MAIN_NAV_THEMES = ["베스트", "골든타임", "당일마감", "지도찾기", "신규오픈", "특가/공구", "모닝픽"];

export function StoreHeader({ activeTheme }: { activeTheme?: ThemeKey }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isCommunityActive = location.pathname.startsWith("/community");
  const [searchParams] = useSearchParams();
  const { data: session } = authClient.useSession();
  const { enabled: largeText, toggle: toggleLargeText } = useLargeText();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState<RawRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string>(Object.keys(CATEGORY_GROUPS)[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const { currentLocation, recentLocations, locating: locatingHome, error: homeLocateError, locateByGps, setManualLocation, selectRecent, clearError } = useLocationStore();
  const navScrollRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setSearchTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!session?.user) {
      setCartCount(0);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    let active = true;
    const refresh = () => {
      void getCart({ silent: true }).then((result) => {
        if (active && result.ok) setCartCount((result.data?.items ?? []).length);
      });
      void getMyNotifications({ silent: true }).then((result) => {
        if (active && result.ok) {
          setNotifications(result.data?.notifications ?? []);
          setUnreadCount(result.data?.unreadCount ?? 0);
        }
      });
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session?.user]);

  // 검색창 외부 클릭 시 추천 레이어 닫기
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

  // ── 추천 검색어 필터링 (실제 검색 데이터가 쌓이면 그걸로 대체) ──
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
      kw.toLowerCase().includes(trimmed)
    );
    return matched.length > 0 ? matched.slice(0, 10) : [trimmed];
  }, [searchTerm, popularTerms]);

  const executeSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    setIsSearchFocused(false);
    setSearchTerm(trimmed);
    if (trimmed) void logSearchTerm(trimmed);
    navigate(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(searchTerm);
    }
  };

  const openNotification = async (item: RawRecord) => {
    setIsNotifOpen(false);
    if (!item.read_at) {
      await markNotificationRead(String(item.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row))
      );
    }
    if (item.link) navigate(String(item.link));
  };

  const readAllNotifications = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((row) => ({ ...row, read_at: row.read_at ?? new Date().toISOString() }))
    );
  };

  const handleNavThemeClick = (theme: string) => {
    if (theme === "지도찾기" || theme === "내 주변 픽업") {
      navigate("/map");
      return;
    }
    const themeKey = THEME_ROUTE[theme];
    if (themeKey) navigate(`/products?theme=${themeKey}`);
  };

  const handleSubcategoryClick = (parent: string, sub: string) => {
    setIsCategoryMenuOpen(false);
    navigate(`/products?category=${encodeURIComponent(parent)}&sub=${encodeURIComponent(sub)}`);
  };

  const handleLocate = async () => {
    const label = await locateByGps();
    if (label) {
      setIsLocationModalOpen(false);
      toast.success(`기준 동네가 [${label}]로 설정되었습니다.`);
    }
  };

  const handleManualAddressSubmit = () => {
    const label = setManualLocation(manualAddress);
    if (!label) return;
    setManualAddress("");
    setIsLocationModalOpen(false);
    toast.success(`기준 동네가 [${label}]로 설정되었습니다.`);
  };

  const handleSelectRecent = (entry: (typeof recentLocations)[number]) => {
    selectRecent(entry);
    setIsLocationModalOpen(false);
    toast.success(`기준 동네가 [${entry.label}]로 설정되었습니다.`);
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily:
          "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif",
      }}
    >
      {/* ── 1. 유틸리티 바 ── */}
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
            style={{ cursor: "pointer", color: TOKENS.primaryOrange, fontWeight: 500 }}
            onClick={() => navigate("/mypage")}
          >
            마이페이지로 이동
          </span>
        ) : (
          <>
            <span
              style={{ cursor: "pointer", color: TOKENS.primaryOrange, fontWeight: 400 }}
              onClick={() => navigate("/auth?mode=signup")}
            >
              회원가입
            </span>
            <span
              style={{
                width: 1,
                height: 13,
                background: TOKENS.borderDivider,
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
            background: TOKENS.borderDivider,
            margin: "0 10px",
            display: "inline-block",
          }}
        />
        <span
          style={{ cursor: "pointer", color: largeText ? TOKENS.primaryOrange : "#333333", fontWeight: largeText ? 700 : 400 }}
          onClick={toggleLargeText}
          title="큰 글씨 모드"
        >
          가 큰글씨
        </span>
        <span
          style={{
            width: 1,
            height: 13,
            background: TOKENS.borderDivider,
            margin: "0 10px",
            display: "inline-block",
          }}
        />
        <div
          onMouseEnter={() => setIsCustomerMenuOpen(true)}
          onMouseLeave={() => setIsCustomerMenuOpen(false)}
          style={{ position: "relative" }}
        >
          <span style={{ cursor: "pointer", color: "#333333" }}>고객센터 ▾</span>
          {isCustomerMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 20,
                right: 0,
                width: 160,
                background: "#ffffff",
                border: `1px solid ${TOKENS.borderMedium}`,
                boxShadow: TOKENS.floatingShadow,
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

      {/* ── 2. 메인 헤더 (로고, 검색창, 아이콘) ── */}
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
          <a
            href="/"
            aria-label="타임딜 홈"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              height: 42,
              marginRight: 16,
            }}
            onClick={(event) => {
              event.preventDefault();
              navigate("/");
            }}
          >
            <img
              src="/images/deal-logo.png"
              alt="타임딜"
              style={{ height: 30, width: "auto", display: "block" }}
            />
          </a>
          <div style={{ display: "flex", alignItems: "center", fontSize: 16, fontWeight: 500 }}>
            <span
              style={{
                color: isCommunityActive ? TOKENS.textSubtle : TOKENS.primaryOrange,
                cursor: "pointer",
                padding: "4px 0",
              }}
              onClick={() => navigate("/products")}
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
                color: isCommunityActive ? TOKENS.primaryOrange : TOKENS.textSubtle,
                cursor: "pointer",
                padding: "4px 0",
              }}
              onClick={() => navigate("/community")}
            >
              커뮤니티
            </span>
          </div>
        </div>

        {/* ── 💡 검색창 + 홈 화면과 동일한 연관 검색어 레이어 ── */}
        <div ref={searchContainerRef} style={{ position: "relative", width: 400 }}>
          <div
            style={{
              width: "100%",
              height: 44,
              border: `1.5px solid ${isSearchFocused ? TOKENS.primaryOrange : TOKENS.navy}`,
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
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "#333333",
                letterSpacing: "-0.3px",
                background: "transparent",
              }}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  executeSearch("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: TOKENS.textSubtle,
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
              aria-label="검색"
            >
              <Search size={22} color={isSearchFocused ? TOKENS.primaryOrange : TOKENS.navy} />
            </button>
          </div>

          {/* 연관 검색어 추천 레이어 */}
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
                onClick={() => {
                  setSearchTerm("이벤트");
                  executeSearch("이벤트");
                }}
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
                  성수동 소상공인 마감 픽업{" "}
                  <b style={{ color: TOKENS.primaryOrange }}>이벤트</b>
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
                    e.currentTarget.style.color = TOKENS.primaryOrange;
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

        {/* 아이콘 버튼 영역 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
            }}
            onClick={() => setIsLocationModalOpen(true)}
            title="동네 설정"
          >
            <MapPin size={22} strokeWidth={1.7} color={TOKENS.primaryOrange} />
            <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.navy, whiteSpace: "nowrap" }}>
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
            <Heart size={24} strokeWidth={1.5} color={TOKENS.navy} />
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
            <ShoppingCart size={24} strokeWidth={1.5} color={TOKENS.navy} />
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  right: -2,
                  background: TOKENS.primaryOrange,
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
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setIsNotifOpen(true)}
              onMouseLeave={() => setIsNotifOpen(false)}
            >
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
                title="알림"
              >
                <Bell size={24} strokeWidth={1.5} color={TOKENS.navy} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: -2,
                      background: TOKENS.primaryOrange,
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
                    {unreadCount}
                  </span>
                )}
              </div>
              {isNotifOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 36,
                    right: 0,
                    width: 320,
                    maxHeight: 400,
                    overflowY: "auto",
                    background: "#ffffff",
                    border: `1px solid ${TOKENS.borderMedium}`,
                    boxShadow: TOKENS.floatingShadow,
                    borderRadius: 8,
                    zIndex: 210,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderBottom: `1px solid ${TOKENS.borderLight}`,
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>알림</strong>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          color: TOKENS.primaryOrange,
                          cursor: "pointer",
                        }}
                        onClick={() => void readAllNotifications()}
                      >
                        모두 읽음
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 14px",
                        fontSize: 13,
                        color: TOKENS.textSubtle,
                        textAlign: "center",
                      }}
                    >
                      알림이 없습니다.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={String(item.id)}
                        onClick={() => void openNotification(item)}
                        style={{
                          padding: "10px 14px",
                          borderBottom: `1px solid ${TOKENS.borderLight}`,
                          cursor: "pointer",
                          background: item.read_at ? "#ffffff" : "#fff8f6",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1a1a1a",
                            marginBottom: 2,
                          }}
                        >
                          {String(item.title)}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: TOKENS.textSubtle,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {String(item.body ?? "")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── 3. 네비게이션 바 ── */}
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
                  color: isCategoryMenuOpen ? TOKENS.primaryOrange : "#1a1a1a",
                  paddingRight: 18,
                  borderRight: `1px solid ${TOKENS.borderLight}`,
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
                    border: `1px solid ${TOKENS.borderMedium}`,
                    boxShadow: TOKENS.floatingShadow,
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
                      borderRight: `1px solid ${TOKENS.borderLight}`,
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
                          color: hoveredCategory === catName ? TOKENS.primaryOrange : "#333333",
                          background: hoveredCategory === catName ? "#ffffff" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{catName}</span>
                        <ChevronRight size={14} color="#999" />
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
                        color: TOKENS.textSubtle,
                        marginBottom: 4,
                        borderBottom: `1px solid ${TOKENS.borderLight}`,
                        paddingBottom: 6,
                      }}
                    >
                      {hoveredCategory} 전체보기
                    </div>
                    {CATEGORY_GROUPS[hoveredCategory]?.map((subItem) => (
                      <div
                        key={subItem}
                        onClick={() => handleSubcategoryClick(hoveredCategory, subItem)}
                        style={{
                          fontSize: 14,
                          color: "#333333",
                          cursor: "pointer",
                          padding: "4px 0",
                        }}
                      >
                        {subItem}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <ul
              ref={navScrollRef}
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
              }}
            >
              {MAIN_NAV_THEMES.map((tab) => {
                const isSelected = activeTheme && THEME_ROUTE[tab] === activeTheme;
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
                        color: isSelected ? TOKENS.primaryOrange : "#333333",
                        background: isSelected ? TOKENS.primaryLight : "transparent",
                        cursor: "pointer",
                        letterSpacing: "-0.3px",
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
          <button
            type="button"
            onClick={() => navigate("/auction")}
            style={{
              border: `1.5px solid ${TOKENS.primaryOrange}`,
              borderRadius: 24,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "#000000",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              background: TOKENS.primaryLight,
              marginLeft: 16,
              cursor: "pointer",
            }}
          >
            직판장 경매
          </button>
          <button
            type="button"
            onClick={() => navigate("/neighborhood")}
            style={{
              border: `1.5px solid ${TOKENS.primaryOrange}`,
              borderRadius: 24,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "#000000",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              background: TOKENS.primaryLight,
              marginLeft: 8,
              cursor: "pointer",
            }}
          >
            동네 딜
          </button>
          <button
            type="button"
            onClick={() => navigate("/impact")}
            style={{
              border: `1.5px solid ${TOKENS.primaryOrange}`,
              borderRadius: 24,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "#000000",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              background: TOKENS.primaryLight,
              marginLeft: 8,
              cursor: "pointer",
            }}
          >
            우리의 임팩트
          </button>
        </div>
      </nav>

      {/* ── 4. 동네 설정 모달 ── */}
      {isLocationModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
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
              boxShadow: TOKENS.floatingShadow,
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
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: TOKENS.navy }}>
                내 동네 설정
              </h3>
              <button
                onClick={() => { setIsLocationModalOpen(false); clearError(); }}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            {recentLocations.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {recentLocations.map((entry) => (
                  <button
                    key={entry.label}
                    onClick={() => handleSelectRecent(entry)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 16,
                      border: `1px solid ${entry.label === currentLocation ? TOKENS.primaryOrange : TOKENS.borderLight}`,
                      background: entry.label === currentLocation ? TOKENS.primaryLight : "#ffffff",
                      color: entry.label === currentLocation ? TOKENS.primaryOrange : TOKENS.navy,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {entry.neighborhood ?? entry.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => void handleLocate()}
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
                border: `1px solid ${TOKENS.primaryOrange}`,
                background: TOKENS.primaryLight,
                color: TOKENS.primaryOrange,
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
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={manualAddress}
                onChange={(event) => setManualAddress(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleManualAddressSubmit();
                }}
                placeholder="주소를 직접 입력"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "12px",
                  borderRadius: 4,
                  border: `1px solid ${TOKENS.borderLight}`,
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
                  background: manualAddress.trim() ? TOKENS.navy : TOKENS.borderLight,
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
              <p style={{ margin: "10px 0 0", color: "#e53935", fontSize: 12 }}>
                {homeLocateError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}