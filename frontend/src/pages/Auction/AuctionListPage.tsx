/**
 * 직판장 경매 목록 화면입니다. 진행 중/마감 임박/종료 탭으로 필터링하고
 * 실시간 카운트다운·에스크로 안전결제 뱃지가 있는 카드를 보여줍니다.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { getAuctions } from "@/lib/api";
import { AUCTION_STATUS_LABEL, feeRateLabel, formatCountdown, type AuctionItem } from "@/shared/auction";
import { formatPrice } from "@/shared/catalog";

type Tab = "live" | "ending-soon" | "ended";
const TABS: Array<[Tab, string]> = [["live", "진행 중"], ["ending-soon", "마감 임박"], ["ended", "종료"]];

function AuctionCard({ auction, nowMs }: { auction: AuctionItem; nowMs: number }) {
  const isLive = auction.status === "live";
  const countdown = isLive ? formatCountdown(auction.endsAt, nowMs) : null;
  return (
    <Link to={`/auction/${auction.id}`} className="auction-card">
      <div className="auction-card-media">
        <img src={auction.image} alt={auction.title} />
        <span className="auction-escrow-badge"><ShieldCheck size={13} /> 에스크로 안전결제</span>
        {isLive && countdown && <span className="auction-countdown">{countdown}</span>}
      </div>
      <div className="auction-card-body">
        <p className="auction-origin">{auction.origin}</p>
        <h3>{auction.title}</h3>
        <div className="auction-price-row"><span>현재가</span><strong>{formatPrice(auction.currentPrice)}</strong></div>
        <div className="auction-meta-row"><span>{AUCTION_STATUS_LABEL[auction.status]}</span><span>{feeRateLabel(auction)}</span></div>
      </div>
    </Link>
  );
}

export default function AuctionListPage() {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("live");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    void getAuctions().then((result) => { if (active && result.ok) setAuctions(result.data?.auctions ?? []); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    if (tab === "ended") return auctions.filter((item) => item.status === "completed" || item.status === "cancelled");
    const active = auctions.filter((item) => item.status === "live" || item.status === "payment_pending" || item.status === "escrow_hold" || item.status === "re_auction");
    if (tab === "live") return active;
    return active.filter((item) => item.status === "live" && new Date(item.endsAt).getTime() - nowMs <= 10 * 60 * 1000);
  }, [auctions, tab, nowMs]);

  return (
    <AppShell>
      <section className="page-hero compact">
        <div>
          <p>LIVE AUCTION</p>
          <h1>🐟 직판장 경매</h1>
          <span>오늘 들어온 산지 직송 수산물을 실시간 경매로 만나보세요. 낙찰 대금은 에스크로로 안전하게 보호됩니다.</span>
        </div>
      </section>
      <section className="section-wrap">
        <div className="category-tabs" role="tablist" aria-label="경매 상태 필터">
          {TABS.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
        </div>
        {loading ? <div className="empty-state">경매 목록을 불러오는 중입니다.</div> : filtered.length === 0 ? <div className="empty-state"><h2>표시할 경매가 없습니다.</h2><p>다른 탭을 선택해 보세요.</p></div> : <div className="auction-grid">{filtered.map((item) => <AuctionCard key={item.id} auction={item} nowMs={nowMs} />)}</div>}
      </section>
    </AppShell>
  );
}
