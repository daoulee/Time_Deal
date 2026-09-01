/**
 * 모바일 팀 Supabase 프로젝트의 딜을 그대로 보여주고 예약·찜을 할 수 있는 "동네 딜" 페이지입니다.
 * 우리 웹 로그인과 별개로 "모바일 앱 계정"으로 로그인해야 예약·찜이 모바일 앱에도 실시간으로 보입니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Heart, MapPin, Store } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layout/AppShell";
import { formatCountdown } from "@/shared/auction";
import { formatPrice } from "@/shared/catalog";
import {
  cancelNeighborhoodReservation,
  getMyNeighborhoodReservations,
  getMyNeighborhoodWishlist,
  getNeighborhoodDeals,
  getNeighborhoods,
  mobileRefresh,
  mobileSignIn,
  mobileSignUp,
  normalizeNeighborhoodDeal,
  reserveNeighborhoodDeal,
  toggleNeighborhoodWishlist,
  type NeighborhoodDeal,
  type RawRecord,
} from "@/lib/api";
import { clearMobileSession, getMobileSession, setMobileSession } from "@/lib/mobile-auth";
import { useLocationStore } from "@/shared/location/LocationContext";

type ReservationRow = { id: string; status: string; reserved_at: string; deals: RawRecord | null };

export default function NeighborhoodPage() {
  const [session, setSession] = useState(() => getMobileSession());
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const { neighborhood: myNeighborhood } = useLocationStore();
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const autoSelectedRef = useRef(false);
  const [deals, setDeals] = useState<NeighborhoodDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [busyDealId, setBusyDealId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => { const timer = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    void getNeighborhoods().then((result) => setNeighborhoods(result.data?.neighborhoods ?? []));
  }, []);

  // 헤더에서 설정한 "내 동네"와 이름이 겹치는 동네가 있으면 처음 한 번만 자동으로 선택해준다.
  useEffect(() => {
    if (autoSelectedRef.current || !myNeighborhood || neighborhoods.length === 0) return;
    autoSelectedRef.current = true;
    const matched = neighborhoods.find((name) => name.includes(myNeighborhood) || myNeighborhood.includes(name));
    if (matched) setSelected(matched);
  }, [myNeighborhood, neighborhoods]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getNeighborhoodDeals(selected || undefined).then((result) => {
      if (!active) return;
      setDeals((result.data?.deals ?? []).map(normalizeNeighborhoodDeal));
      setLoading(false);
    });
    return () => { active = false; };
  }, [selected]);

  const loadMyStuff = useCallback(async (token: string) => {
    const [wl, rsv] = await Promise.all([getMyNeighborhoodWishlist(token), getMyNeighborhoodReservations(token)]);
    if (wl.ok) setWishlistIds(new Set((wl.data?.items ?? []).map((item) => item.deal_id as string)));
    if (rsv.ok) setReservations((rsv.data?.reservations ?? []) as unknown as ReservationRow[]);
    if (!wl.ok && wl.status === 401) { clearMobileSession(); setSession(null); }
  }, []);

  useEffect(() => { if (session) void loadMyStuff(session.accessToken); }, [session, loadMyStuff]);

  const withMobileAuth = useCallback(async <T,>(action: (token: string) => Promise<{ ok: boolean; status: number; data: T | null; error: { code: string; message: string } | null }>) => {
    if (!session) { toast.error("모바일 앱 계정으로 먼저 로그인해주세요."); return null; }
    let result = await action(session.accessToken);
    if (!result.ok && result.status === 401) {
      const refreshed = await mobileRefresh(session.refreshToken);
      if (refreshed.ok && refreshed.data) {
        const nextSession = { ...session, accessToken: refreshed.data.accessToken, refreshToken: refreshed.data.refreshToken };
        setMobileSession(nextSession.accessToken, nextSession.refreshToken, nextSession.user);
        setSession(nextSession);
        result = await action(nextSession.accessToken);
      } else {
        clearMobileSession();
        setSession(null);
        toast.error("모바일 계정 로그인이 만료되었습니다. 다시 로그인해주세요.");
      }
    }
    return result;
  }, [session]);

  const handleAuthSubmit = async () => {
    if (!email.trim() || password.length < 6) { toast.error("이메일과 6자 이상 비밀번호를 입력하세요."); return; }
    setAuthBusy(true); setAuthNotice(null);
    if (authMode === "signin") {
      const result = await mobileSignIn(email.trim(), password);
      setAuthBusy(false);
      if (!result.ok || !result.data) { toast.error(result.error?.message ?? "로그인에 실패했습니다."); return; }
      setMobileSession(result.data.accessToken, result.data.refreshToken, result.data.user);
      setSession(getMobileSession());
      toast.success("모바일 앱 계정으로 로그인했습니다.");
    } else {
      const result = await mobileSignUp(email.trim(), password);
      setAuthBusy(false);
      if (!result.ok || !result.data) { toast.error(result.error?.message ?? "회원가입에 실패했습니다."); return; }
      if (result.data.needsConfirmation || !result.data.accessToken || !result.data.refreshToken) {
        setAuthNotice("인증 메일을 확인한 뒤 로그인해주세요.");
        setAuthMode("signin");
        return;
      }
      setMobileSession(result.data.accessToken, result.data.refreshToken, result.data.user);
      setSession(getMobileSession());
      toast.success("모바일 앱 계정 회원가입이 완료되었습니다.");
    }
  };

  const handleReserve = async (deal: NeighborhoodDeal) => {
    setBusyDealId(deal.id);
    const result = await withMobileAuth((token) => reserveNeighborhoodDeal(deal.id, token));
    setBusyDealId(null);
    if (!result) return;
    if (!result.ok) { toast.error(result.error?.message ?? "예약에 실패했습니다."); return; }
    toast.success(`${deal.title} 예약이 완료되었습니다. 모바일 앱에서도 바로 확인할 수 있어요.`);
    setDeals((prev) => prev.map((item) => (item.id === deal.id ? { ...item, remainingStock: Math.max(0, item.remainingStock - 1) } : item)));
    if (session) void loadMyStuff(session.accessToken);
  };

  const handleCancelReservation = async (reservationId: string) => {
    const result = await withMobileAuth((token) => cancelNeighborhoodReservation(reservationId, token));
    if (!result) return;
    if (!result.ok) { toast.error(result.error?.message ?? "예약 취소에 실패했습니다."); return; }
    toast.success("예약을 취소했습니다.");
    if (session) void loadMyStuff(session.accessToken);
    void getNeighborhoodDeals(selected || undefined).then((r) => setDeals((r.data?.deals ?? []).map(normalizeNeighborhoodDeal)));
  };

  const handleToggleWishlist = async (deal: NeighborhoodDeal) => {
    const wasLiked = wishlistIds.has(deal.id);
    setWishlistIds((prev) => { const next = new Set(prev); if (wasLiked) next.delete(deal.id); else next.add(deal.id); return next; });
    const result = await withMobileAuth((token) => toggleNeighborhoodWishlist(deal.id, token));
    if (!result || !result.ok) {
      setWishlistIds((prev) => { const next = new Set(prev); if (wasLiked) next.add(deal.id); else next.delete(deal.id); return next; });
    }
  };

  const activeReservations = useMemo(() => reservations.filter((r) => r.status === "진행중"), [reservations]);

  return (
    <AppShell>
      <section className="page-hero compact">
        <div><p>NEIGHBORHOOD</p><h1>동네 딜</h1><span>모바일 앱과 실시간으로 연동되는 우리 동네 마감 임박 특가입니다.</span></div>
      </section>
      <section className="section-wrap">
        {!session ? (
          <div className="empty-state" style={{ maxWidth: 380, margin: "0 auto 32px", padding: 24, border: "1px solid var(--border)", borderRadius: 12 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>모바일 앱 계정으로 로그인</h2>
            <p className="muted-copy" style={{ marginTop: 4 }}>타임딜 웹에 로그인하면 같은 이메일로 모바일 앱 계정도 자동으로 연결돼요. 아직 연결 전이거나 모바일 앱에서 먼저 가입하셨다면 여기서 직접 로그인해 주세요.</p>
            <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
              <button type="button" className={authMode === "signin" ? "primary-button" : "secondary-button"} onClick={() => setAuthMode("signin")}>로그인</button>
              <button type="button" className={authMode === "signup" ? "primary-button" : "secondary-button"} onClick={() => setAuthMode("signup")}>회원가입</button>
            </div>
            {authNotice && <p className="muted-copy">{authNotice}</p>}
            <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginBottom: 8 }} />
            <input type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", marginBottom: 12 }} />
            <button type="button" className="primary-button full" disabled={authBusy} onClick={() => void handleAuthSubmit()}>{authBusy ? "처리 중..." : authMode === "signin" ? "로그인" : "회원가입"}</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span className="muted-copy">{session.user.email} 계정으로 연동됨</span>
            <button type="button" className="secondary-button" onClick={() => { clearMobileSession(); setSession(null); setReservations([]); setWishlistIds(new Set()); }}>연동 해제</button>
          </div>
        )}

        {session && activeReservations.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}><Clock3 size={18} /> 내 예약 내역</h2>
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
              {activeReservations.map((r) => (
                <li key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                  <span>{(r.deals?.title as string) ?? "딜"} · {(r.deals?.store_name as string) ?? ""}</span>
                  <button type="button" className="secondary-button" onClick={() => void handleCancelReservation(r.id)}>예약 취소</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button type="button" className={!selected ? "primary-button" : "secondary-button"} onClick={() => setSelected("")}>전체</button>
          {neighborhoods.map((name) => (
            <button key={name} type="button" className={selected === name ? "primary-button" : "secondary-button"} onClick={() => setSelected(name)}>{name}</button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state page-empty">딜을 불러오는 중입니다.</div>
        ) : deals.length === 0 ? (
          <div className="empty-state page-empty"><h2>이 동네에는 아직 딜이 없습니다.</h2></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {deals.map((deal) => {
              const discountPercent = deal.originalPrice > 0 ? Math.round((1 - deal.discountedPrice / deal.originalPrice) * 100) : 0;
              const stockRatio = deal.totalStock > 0 ? deal.remainingStock / deal.totalStock : 0;
              const soldOut = deal.remainingStock <= 0;
              return (
                <div key={deal.id} className="product-card" style={{ position: "relative" }}>
                  {session && (
                    <button type="button" onClick={() => void handleToggleWishlist(deal)} aria-label="찜" style={{ position: "absolute", top: 10, right: 10, zIndex: 1, background: "rgba(255,255,255,0.9)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                      <Heart size={16} fill={wishlistIds.has(deal.id) ? "#ff5a5f" : "none"} color={wishlistIds.has(deal.id) ? "#ff5a5f" : "#999"} />
                    </button>
                  )}
                  <div style={{ height: 140, borderRadius: 10, overflow: "hidden", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {deal.imageUrl ? <img src={deal.imageUrl} alt={deal.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Store size={28} />}
                  </div>
                  <div style={{ padding: "10px 2px" }}>
                    <div className="muted-copy" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {deal.storeName} {deal.neighborhood ? `· ${deal.neighborhood}` : ""}</div>
                    <strong style={{ display: "block", margin: "4px 0", fontSize: 15 }}>{deal.title}</strong>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      {discountPercent > 0 && <span style={{ color: "#ff5a5f", fontWeight: 700 }}>{discountPercent}%</span>}
                      <strong>{formatPrice(deal.discountedPrice)}</strong>
                      {deal.originalPrice > deal.discountedPrice && <span className="muted-copy" style={{ textDecoration: "line-through", fontSize: 12 }}>{formatPrice(deal.originalPrice)}</span>}
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--muted)", margin: "8px 0 4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round(stockRatio * 100)}%`, background: stockRatio < 0.3 ? "#ff5a5f" : "#ff8a3d" }} />
                    </div>
                    <div className="muted-copy" style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                      <span>남은 수량 {deal.remainingStock}/{deal.totalStock}</span>
                      <span>{formatCountdown(deal.expiresAt, nowMs)}</span>
                    </div>
                    <button type="button" className="primary-button full" style={{ marginTop: 10 }} disabled={soldOut || busyDealId === deal.id} onClick={() => void handleReserve(deal)}>
                      {soldOut ? "재고 소진" : busyDealId === deal.id ? "예약 중..." : "예약하기"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
