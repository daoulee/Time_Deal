/**
 * 판매자가 상품·이미지·타임딜·재고·픽업·문의·fulfillment를 실제 API로 운영하는 화면입니다.
 * 모든 패널은 로딩·빈 상태·오류·성공 피드백과 mutation 중 중복 실행 방지를 제공합니다.
 */
import { ImageUp, LoaderCircle, PackageCheck, RefreshCw, Send, TrendingUp } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardShell } from "@/shared/layout/DashboardShell";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { adjustInventory, createSellerProductWithDeal, getInventoryHistory, getNewProductUploadUrl, getProductUploadUrl, getSellerAnalytics, getSellerDashboard, getSellerFulfillments, getSellerInquiries, getSellerPickupLocations, getSellerPickupSlots, getSellerProducts, getSellerReopenRequests, hideSellerProduct, replySellerInquiry, submitSellerProduct, updateFulfillmentStatus, updateSellerProduct, uploadProductImage, type Fulfillment, type Inquiry, type RawRecord, type SellerReopenRequest, type SellerSaleItem, type SellerTimedStatus } from "@/lib/api";
import { formatPrice } from "@/shared/catalog";

const info: Record<string, [string, string]> = {
  "/seller": ["판매자 대시보드", "상품·fulfillment·문의와 예약 금액을 실시간 집계합니다."], "/seller/products": ["상품 관리", "상품을 수정·숨김·검수 요청하고 이미지와 재고를 관리합니다."], "/seller/products/new": ["상품 등록", "상품·사진·타임딜을 한 번에 등록하면 즉시 판매가 시작됩니다."], "/seller/orders": ["주문 현황", "판매자별 fulfillment를 정방향으로 처리합니다."], "/seller/analytics": ["통계·픽업", "판매 현황·수익과 품목별 실적을 그래프로 확인합니다."], "/seller/inquiries": ["판매자 문의", "배정된 고객 문의 대화를 확인하고 답변합니다."],
};
const str = (item: RawRecord, key: string) => String(item[key] ?? ""); const num = (item: RawRecord, key: string) => Number(item[key] ?? 0);
const date = (input?: string) => input ? new Date(input).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "-";
type StatPeriod = "week" | "month" | "year";
const dayLabel = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}`; };
const startOfWeek = (input: Date) => { const d = new Date(input); const day = d.getDay(); d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day)); d.setHours(0, 0, 0, 0); return d; };
const bucketLabel = (iso: string, period: StatPeriod) => { const d = new Date(iso); if (period === "year") return `${d.getFullYear()}년`; if (period === "month") return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`; const monday = startOfWeek(d); return `${monday.getMonth() + 1}/${monday.getDate()}주`; };
const statusLabel: Record<string, string> = { pending: "접수", confirmed: "확인", ready: "픽업 준비", completed: "완료", cancelled: "취소", draft: "초안", pending_review: "검수 중", active: "운영", rejected: "반려", hidden: "숨김", ended: "종료", open: "접수", in_progress: "처리 중", closed: "완료", no_show: "미수령" };
const nextStatus: Record<string, "confirmed" | "ready" | "completed" | undefined> = { pending: "confirmed", confirmed: "ready", ready: "completed" };
const fulfillmentColor: Record<string, string> = { pending: "var(--chart-5)", confirmed: "var(--chart-3)", ready: "var(--chart-4)", completed: "var(--chart-1)", cancelled: "var(--destructive)" };
const inquiryColor: Record<string, string> = { open: "var(--chart-5)", in_progress: "var(--chart-3)", closed: "var(--chart-1)" };
const pickupColor: Record<string, string> = { pending: "var(--chart-5)", ready: "var(--chart-4)", collected: "var(--chart-1)", no_show: "var(--destructive)" };
const percent = (part: number, total: number) => total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";
type StatWindow = "all" | "week" | "month" | "year";
const windowStart = (window: StatWindow): Date | null => { const now = new Date(); if (window === "week") return startOfWeek(now); if (window === "month") return new Date(now.getFullYear(), now.getMonth(), 1); if (window === "year") return new Date(now.getFullYear(), 0, 1); return null; };
const withinWindow = (iso: string, window: StatWindow) => { const start = windowStart(window); return !start || new Date(iso) >= start; };
const windowLabel: Record<StatWindow, string> = { all: "전체", week: "이번 주", month: "이번 달", year: "올해" };

function Feedback({ error, notice }: { error: string | null; notice: string | null }) { return <>{notice && <div className="order-notice" role="status">{notice}</div>}{error && <div className="order-error" role="alert">{error}</div>}</>; }
function Loading({ text }: { text: string }) { return <div className="order-loading"><LoaderCircle className="spin-icon" /> {text}</div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state compact-empty"><PackageCheck size={30} /><h3>{title}</h3><p>{text}</p></div>; }

function DashboardPanel() {
  const [data, setData] = useState<Record<string, number> | null>(null); const [fulfillmentGroups, setFulfillmentGroups] = useState<SellerTimedStatus[]>([]); const [inquiryRows, setInquiryRows] = useState<SellerTimedStatus[]>([]); const [reopenRequests, setReopenRequests] = useState<SellerReopenRequest[]>([]); const [error, setError] = useState<string | null>(null); const [statsWindow, setStatsWindow] = useState<StatWindow>("all");
  useEffect(() => { let active = true; void getSellerDashboard().then((result) => { if (!active) return; if (result.ok) { setData(result.data?.dashboard ?? null); setFulfillmentGroups(result.data?.fulfillmentGroups ?? []); setInquiryRows(result.data?.inquiries ?? []); } else setError(result.error?.message ?? "운영 현황을 불러오지 못했습니다."); }); return () => { active = false; }; }, []);
  useEffect(() => { let active = true; void getSellerReopenRequests().then((result) => { if (active && result.ok) setReopenRequests(result.data?.requests ?? []); }); return () => { active = false; }; }, []);
  if (!data && !error) return <Loading text="판매자 운영 지표를 집계하는 중입니다." />;
  const metrics: Array<[string, string | number]> = [["등록 상품", Number(data?.productCount ?? 0)], ["fulfillment", Number(data?.fulfillmentCount ?? 0)], ["예약 금액", formatPrice(Number(data?.grossReservedAmount ?? 0))], ["답변 대기 문의", Number(data?.openInquiryCount ?? 0)]];
  const filteredGroups = fulfillmentGroups.filter((item) => withinWindow(item.createdAt, statsWindow));
  const filteredInquiries = inquiryRows.filter((item) => withinWindow(item.createdAt, statsWindow));
  const fulfillmentStatus = Object.fromEntries(["pending", "confirmed", "ready", "completed", "cancelled"].map((status) => [status, filteredGroups.filter((item) => item.status === status).length]));
  const fulfillmentTotal = Object.values(fulfillmentStatus).reduce((sum, value) => sum + value, 0);
  const fulfillmentPie = Object.entries(fulfillmentStatus).filter(([, value]) => value > 0).map(([key, value]) => ({ key, label: statusLabel[key] ?? key, value }));
  const inquiryStatus = Object.fromEntries(["open", "in_progress", "closed"].map((status) => [status, filteredInquiries.filter((item) => item.status === status).length]));
  const inquiryBars = ["open", "in_progress", "closed"].map((key) => ({ key, label: statusLabel[key] ?? key, value: inquiryStatus[key] ?? 0 }));
  return <>
    <Feedback error={error} notice={null} />
    <div className="metric-grid">{metrics.map(([label, value]) => <article key={String(label)}><span><TrendingUp /></span><p>{label}</p><strong>{value ?? 0}</strong></article>)}</div>
    <div className="metric-grid">
      <article><span><TrendingUp /></span><p>상품 판매율(완료)</p><strong>{percent(fulfillmentStatus.completed ?? 0, fulfillmentTotal)}</strong></article>
      <article><span><TrendingUp /></span><p>취소율</p><strong>{percent(fulfillmentStatus.cancelled ?? 0, fulfillmentTotal)}</strong></article>
    </div>
    <div className="stat-controls"><div className="stat-toggle">{(["all", "week", "month", "year"] as const).map((value) => <button key={value} type="button" className={statsWindow === value ? "active" : ""} onClick={() => setStatsWindow(value)}>{value === "all" ? "전체" : value === "week" ? "주" : value === "month" ? "달" : "년"}</button>)}</div><small className="muted-copy">{windowLabel[statsWindow]} 데이터 기준</small></div>
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>FULFILLMENT STATUS</p><h2>상품 판매·취소 현황</h2></div><StatusBadge type="live">실시간 집계</StatusBadge></div>
      {fulfillmentTotal === 0 ? <Empty title="처리 데이터가 없습니다." text="선택한 기간에 접수된 주문이 없습니다." /> : <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={fulfillmentPie} dataKey="value" nameKey="label" innerRadius={60} outerRadius={95} paddingAngle={2}>{fulfillmentPie.map((entry) => <Cell key={entry.key} fill={fulfillmentColor[entry.key] ?? "var(--chart-5)"} />)}</Pie><Tooltip formatter={(value, _name, item) => [`${Number(value)}건`, item?.payload?.label ?? ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>}
    </section>
    <section className="dashboard-panel spaced-panel">
      <div className="panel-title-row"><div><p>INQUIRY HANDLING</p><h2>민원 처리 과정</h2></div><StatusBadge type="live">배정 문의 집계</StatusBadge></div>
      {inquiryBars.every((item) => item.value === 0) ? <Empty title="배정된 문의가 없습니다." text="선택한 기간에 배정된 문의가 없습니다." /> : <ResponsiveContainer width="100%" height={220}><BarChart data={inquiryBars}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} /><Tooltip formatter={(value) => `${Number(value)}건`} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="value" name="문의" radius={[4, 4, 0, 0]}>{inquiryBars.map((entry) => <Cell key={entry.key} fill={inquiryColor[entry.key] ?? "var(--chart-5)"} />)}</Bar></BarChart></ResponsiveContainer>}
    </section>
    <section className="dashboard-panel spaced-panel">
      <div className="panel-title-row"><div><p>REOPEN REQUESTS</p><h2>재오픈 요청</h2></div><StatusBadge type="live">홈 화면 고객 투표</StatusBadge></div>
      {reopenRequests.length === 0 ? <Empty title="접수된 재오픈 요청이 없습니다." text="고객이 홈 화면 '이 딜 다시 열어주세요'에서 요청하면 여기에 표시됩니다." /> : <div className="operation-list">{reopenRequests.map((item) => <article className="compact-row" key={item.productId}><span><b>{item.productName}</b></span><strong>{item.requestCount}명 요청 · 최근 {date(item.latestRequestedAt)}</strong></article>)}</div>}
    </section>
  </>;
}

function ProductForm({ onSaved }: { onSaved?: () => void }) {
  const emptyForm = { name: "", description: "", category: "", regularPrice: 0, inventory: 0, dealPrice: 0, target: 1, startsAt: "", endsAt: "" };
  const [form, setForm] = useState(emptyForm); const [imageFile, setImageFile] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const pickImage = (file: File | null) => { setImageFile(file); setImagePreview((current) => { if (current) URL.revokeObjectURL(current); return file ? URL.createObjectURL(file) : null; }); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    let image = "products/default.webp";
    if (imageFile) {
      const signed = await getNewProductUploadUrl(imageFile);
      if (!signed.ok || !signed.data) { setBusy(false); return setError(signed.error?.message ?? "이미지 업로드 URL을 만들지 못했습니다."); }
      const uploaded = await uploadProductImage(signed.data.bucket, signed.data.objectPath, signed.data.token, imageFile);
      if (!uploaded.ok) { setBusy(false); return setError(uploaded.error ?? "이미지 업로드에 실패했습니다."); }
      image = signed.data.objectPath;
    }
    const result = await createSellerProductWithDeal({ name: form.name, description: form.description, category: form.category, image, regularPrice: form.regularPrice, inventory: form.inventory, dealPrice: form.dealPrice, target: form.target, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() });
    setBusy(false);
    if (!result.ok) return setError(result.error?.message ?? "상품과 딜을 등록하지 못했습니다.");
    setNotice("상품과 타임딜을 등록했습니다. 지금 바로 판매가 시작됩니다.");
    setForm(emptyForm); pickImage(null); onSaved?.();
  };
  return <section className="dashboard-panel"><div className="panel-title-row"><div><p>NEW PRODUCT</p><h2>상품·타임딜 등록</h2></div><StatusBadge type="live">즉시 판매 시작</StatusBadge></div><Feedback error={error} notice={notice} /><form className="operation-form" onSubmit={submit}><label>상품명<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>카테고리<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label><label>정상가<input required min={0} type="number" value={form.regularPrice} onChange={(event) => setForm({ ...form, regularPrice: Number(event.target.value) })} /></label><label>초기 재고<input required min={0} type="number" value={form.inventory} onChange={(event) => setForm({ ...form, inventory: Number(event.target.value) })} /></label><label className="wide">설명<textarea required minLength={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="wide">상품 사진{imagePreview && <img src={imagePreview} alt="상품 미리보기" className="product-image-preview" />}<label className="file-action"><ImageUp size={15} /> {imageFile ? "사진 변경" : "사진 선택"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickImage(event.target.files?.[0] ?? null)} /></label></label><label>딜 가격<input required min={0} max={form.regularPrice} type="number" value={form.dealPrice} onChange={(event) => setForm({ ...form, dealPrice: Number(event.target.value) })} /></label><label>목표 수량<input required min={1} type="number" value={form.target} onChange={(event) => setForm({ ...form, target: Number(event.target.value) })} /></label><label>딜 시작<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label><label>딜 종료<input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label><button className="primary-button" disabled={busy}>{busy && <LoaderCircle className="spin-icon" size={16} />}상품·딜 등록</button></form></section>;
}

function ProductsPanel() {
  const [items, setItems] = useState<RawRecord[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [history, setHistory] = useState<Record<string, RawRecord[]>>({});
  const load = useCallback(async () => { setLoading(true); const result = await getSellerProducts(); setLoading(false); if (result.ok) setItems(result.data?.products ?? []); else setError(result.error?.message ?? "상품을 불러오지 못했습니다."); }, []);
  useEffect(() => { void load(); }, [load]);
  const action = async (id: string, kind: "save" | "submit" | "hide" | "inventory", payload?: RawRecord) => { setBusy(id + kind); setError(null); setNotice(null); const current = items.find((item) => item.id === id)!; const result = kind === "save" ? await updateSellerProduct(id, { name: str(current, "name"), description: str(current, "description"), category: str(current, "category"), regularPrice: num(current, "regular_price"), inventory: num(current, "inventory"), image: str(current, "image_path") || str(current, "image") }) : kind === "submit" ? await submitSellerProduct(id) : kind === "hide" ? await hideSellerProduct(id) : await adjustInventory(id, Number(payload?.delta), String(payload?.reason) as "manual" | "restock"); setBusy(null); if (!result.ok) return setError(result.error?.message ?? "요청을 처리하지 못했습니다."); setNotice(kind === "inventory" ? "재고와 재고 원장을 갱신했습니다." : "상품 상태를 갱신했습니다."); await load(); };
  const upload = async (id: string, file: File) => { setBusy(id + "upload"); setError(null); const signed = await getProductUploadUrl(id, file); if (!signed.ok || !signed.data) { setBusy(null); return setError(signed.error?.message ?? "업로드 URL을 만들지 못했습니다."); } const uploaded = await uploadProductImage(signed.data.bucket, signed.data.objectPath, signed.data.token, file); if (!uploaded.ok) { setBusy(null); return setError("Storage 이미지 업로드에 실패했습니다."); } const saved = await updateSellerProduct(id, { image: signed.data.objectPath }); setBusy(null); if (!saved.ok) return setError(saved.error?.message ?? "이미지 경로를 저장하지 못했습니다."); setNotice("상품 이미지를 업로드했습니다."); await load(); };
  const showHistory = async (id: string) => { const result = await getInventoryHistory(id); if (!result.ok) return setError(result.error?.message ?? "재고 이력을 불러오지 못했습니다."); setHistory((current) => ({ ...current, [id]: result.data?.movements ?? [] })); };
  if (loading) return <Loading text="상품 목록을 불러오는 중입니다." />;
  return <section className="dashboard-panel"><div className="panel-title-row"><div><p>PRODUCT OPERATIONS</p><h2>등록 상품</h2></div><button className="secondary-button" onClick={() => void load()}><RefreshCw size={15} /> 새로고침</button></div><Feedback error={error} notice={notice} />{items.length === 0 ? <Empty title="등록 상품이 없습니다." text="상품 등록 메뉴에서 첫 상품을 추가하세요." /> : <div className="operation-list">{items.map((item) => <article className="operation-card" key={str(item, "id")}><header><div><strong>{str(item, "name")}</strong><small>{str(item, "category")} · 재고 {num(item, "inventory")}</small></div><StatusBadge type={str(item, "status") === "active" ? "live" : "ready"}>{statusLabel[str(item, "status")] ?? str(item, "status")}</StatusBadge></header><div className="operation-form compact"><label>상품명<input value={str(item, "name")} onChange={(event) => setItems((list) => list.map((row) => row.id === item.id ? { ...row, name: event.target.value } : row))} /></label><label>정상가<input type="number" value={num(item, "regular_price")} onChange={(event) => setItems((list) => list.map((row) => row.id === item.id ? { ...row, regular_price: Number(event.target.value) } : row))} /></label><label className="wide">설명<textarea value={str(item, "description")} onChange={(event) => setItems((list) => list.map((row) => row.id === item.id ? { ...row, description: event.target.value } : row))} /></label></div><div className="action-row"><button onClick={() => void action(str(item, "id"), "save")} disabled={busy !== null}>수정 저장</button>{["draft", "rejected"].includes(str(item, "status")) && <button onClick={() => void action(str(item, "id"), "submit")} disabled={busy !== null}>검수 요청</button>}{["active", "pending_review"].includes(str(item, "status")) && <button onClick={() => void action(str(item, "id"), "hide")} disabled={busy !== null}>상품 숨김</button>}<label className="file-action"><ImageUp size={15} /> 이미지 업로드<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(str(item, "id"), file); }} /></label><button onClick={() => { const delta = Number(window.prompt("재고 증감 수량을 입력하세요. 예: 10 또는 -3")); if (delta) void action(str(item, "id"), "inventory", { delta, reason: delta > 0 ? "restock" : "manual" }); }} disabled={busy !== null}>재고 조정</button><button onClick={() => void showHistory(str(item, "id"))}>재고 이력</button></div>{history[str(item, "id")] && <div className="history-list">{history[str(item, "id")].length === 0 ? <small>기록이 없습니다.</small> : history[str(item, "id")].map((movement) => <span key={str(movement, "id")}>{date(str(movement, "created_at"))} · {str(movement, "reason")} · {num(movement, "quantity_delta") > 0 ? "+" : ""}{num(movement, "quantity_delta")}</span>)}</div>}</article>)}</div>}</section>;
}

function FulfillmentsPanel() {
  const [items, setItems] = useState<Fulfillment[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); const result = await getSellerFulfillments(); setLoading(false); if (result.ok) setItems(result.data?.fulfillments ?? []); else setError(result.error?.message ?? "fulfillment를 불러오지 못했습니다."); }, []); useEffect(() => { void load(); }, [load]);
  const advance = async (item: Fulfillment) => { const next = nextStatus[item.status]; if (!next) return; setBusy(item.id); const result = await updateFulfillmentStatus(item.id, next); setBusy(null); if (!result.ok) return setError(result.error?.message ?? "상태를 변경하지 못했습니다."); setNotice(`${item.orderNumber} 처리를 ${statusLabel[next]} 단계로 변경했습니다.`); await load(); };
  if (loading) return <Loading text="판매자별 fulfillment를 불러오는 중입니다." />;
  return <section className="dashboard-panel"><div className="panel-title-row"><div><p>FULFILLMENT</p><h2>판매자 처리 목록</h2></div><StatusBadge type="live">최소 정보 DTO</StatusBadge></div><Feedback error={error} notice={notice} />{items.length === 0 ? <Empty title="처리할 주문이 없습니다." text="담당 상품 주문이 접수되면 표시됩니다." /> : <div className="operation-list">{items.map((item) => <article className="seller-order-row" key={item.id}><div className="seller-order-main"><span>{item.orderNumber}</span><strong>{item.items.map((row) => `${row.productName} × ${row.quantity}`).join(", ")}</strong><small>{date(item.createdAt)} · {formatPrice(item.subtotal)} · 장소 {item.pickupLocationId}{item.deliveryAddress ? ` · 수령 주소 ${item.deliveryAddress}` : ""}</small></div><div className="seller-order-meta"><StatusBadge type={item.status === "completed" ? "live" : "ready"}>{statusLabel[item.status]}</StatusBadge><small>픽업 {item.pickupStatus}</small></div>{nextStatus[item.status] && <button className="secondary-button" disabled={busy === item.id} onClick={() => void advance(item)}>{busy === item.id && <LoaderCircle className="spin-icon" size={15} />}{statusLabel[nextStatus[item.status]!]}로 변경</button>}</article>)}</div>}</section>;
}

function AnalyticsPanel() {
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]); const [items, setItems] = useState<SellerSaleItem[]>([]); const [pickupStatus, setPickupStatus] = useState<Record<string, number>>({}); const [locations, setLocations] = useState<Array<{ id: string; name: string; address: string }>>([]); const [slots, setSlots] = useState<Array<{ id: string; pickupDate: string; startTime: string; endTime: string; capacity: number; reservedCount: number }>>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("all"); const [period, setPeriod] = useState<StatPeriod>("week"); const [metric, setMetric] = useState<"revenue" | "quantity">("revenue");
  useEffect(() => {
    let active = true;
    void Promise.all([getSellerAnalytics(), getSellerPickupLocations(), getSellerPickupSlots()]).then(([analyticsResult, locationResult, slotResult]) => {
      if (!active) return;
      if (analyticsResult.ok) { setProducts(analyticsResult.data?.products ?? []); setItems(analyticsResult.data?.items ?? []); setPickupStatus(analyticsResult.data?.pickupStatus ?? {}); } else setError(analyticsResult.error?.message ?? "판매 통계를 불러오지 못했습니다.");
      if (locationResult.ok) setLocations(locationResult.data?.locations ?? []);
      if (slotResult.ok) setSlots(slotResult.data?.slots ?? []);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const overview = useMemo(() => { const todayKey = new Date().toISOString().slice(0, 10); return { totalRevenue: items.reduce((sum, item) => sum + item.line_total, 0), totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0), productCount: products.length, todayRevenue: items.filter((item) => item.created_at.slice(0, 10) === todayKey).reduce((sum, item) => sum + item.line_total, 0) }; }, [items, products]);
  const pickupTotal = Object.values(pickupStatus).reduce((sum, value) => sum + value, 0);
  const pickupPie = Object.entries(pickupStatus).filter(([, value]) => value > 0).map(([key, value]) => ({ key, label: statusLabel[key] ?? key, value }));
  const trend = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const item of items) { const key = item.created_at.slice(0, 10); byDay.set(key, (byDay.get(key) ?? 0) + item.line_total); }
    const today = new Date(); const days: Array<{ label: string; revenue: number }> = [];
    for (let i = 29; i >= 0; i -= 1) { const d = new Date(today); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); days.push({ label: dayLabel(key), revenue: byDay.get(key) ?? 0 }); }
    return days;
  }, [items]);
  const productSeries = useMemo(() => {
    const filtered = selectedProductId === "all" ? items : items.filter((item) => item.product_id === selectedProductId);
    const byBucket = new Map<string, number>();
    for (const item of filtered) { const key = bucketLabel(item.created_at, period); byBucket.set(key, (byBucket.get(key) ?? 0) + (metric === "revenue" ? item.line_total : item.quantity)); }
    return Array.from(byBucket.entries()).map(([label, value]) => ({ label, value }));
  }, [items, selectedProductId, period, metric]);
  if (loading) return <Loading text="판매 통계를 불러오는 중입니다." />;
  return <>
    <Feedback error={error} notice={null} />
    <div className="metric-grid">
      <article><span><TrendingUp /></span><p>오늘 매출</p><strong>{formatPrice(overview.todayRevenue)}</strong></article>
      <article><span><TrendingUp /></span><p>총 매출</p><strong>{formatPrice(overview.totalRevenue)}</strong></article>
      <article><span><TrendingUp /></span><p>총 판매 수량</p><strong>{overview.totalQuantity}개</strong></article>
      <article><span><TrendingUp /></span><p>픽업율</p><strong>{percent(pickupStatus.collected ?? 0, pickupTotal)}</strong></article>
    </div>
    <section className="dashboard-panel">
      <div className="panel-title-row"><div><p>SALES TREND</p><h2>최근 30일 매출 추이</h2></div><StatusBadge type="live">주문 기반 집계</StatusBadge></div>
      {items.length === 0 ? <Empty title="판매 데이터가 없습니다." text="주문이 접수되면 매출 추이가 표시됩니다." /> : <ResponsiveContainer width="100%" height={240}><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} stroke="var(--muted-foreground)" width={90} tickFormatter={(value: number) => formatPrice(value)} /><Tooltip formatter={(value) => formatPrice(Number(value))} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Area type="monotone" dataKey="revenue" name="매출" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.16} /></AreaChart></ResponsiveContainer>}
    </section>
    <section className="dashboard-panel spaced-panel">
      <div className="panel-title-row"><div><p>PRODUCT PERFORMANCE</p><h2>품목별 실적</h2></div><StatusBadge type="live">기간별 비교</StatusBadge></div>
      <div className="stat-controls">
        <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}><option value="all">전체 상품</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
        <div className="stat-toggle">{(["week", "month", "year"] as const).map((value) => <button key={value} type="button" className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{value === "week" ? "주" : value === "month" ? "달" : "년"}</button>)}</div>
        <div className="stat-toggle">{(["revenue", "quantity"] as const).map((value) => <button key={value} type="button" className={metric === value ? "active" : ""} onClick={() => setMetric(value)}>{value === "revenue" ? "매출" : "판매수량"}</button>)}</div>
      </div>
      {productSeries.length === 0 ? <Empty title="표시할 실적이 없습니다." text="선택한 상품·기간에 판매 데이터가 없습니다." /> : <ResponsiveContainer width="100%" height={240}><BarChart data={productSeries}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} stroke="var(--muted-foreground)" width={90} tickFormatter={(value: number) => metric === "revenue" ? formatPrice(value) : String(value)} /><Tooltip formatter={(value) => metric === "revenue" ? formatPrice(Number(value)) : `${Number(value)}개`} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="value" name={metric === "revenue" ? "매출" : "판매수량"} fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}
    </section>
    <section className="dashboard-panel spaced-panel">
      <div className="panel-title-row"><div><p>PICKUP RATE</p><h2>픽업율</h2></div><StatusBadge type="live">fulfillment 집계</StatusBadge></div>
      {pickupTotal === 0 ? <Empty title="픽업 데이터가 없습니다." text="주문이 픽업 단계에 도달하면 픽업율이 표시됩니다." /> : <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={pickupPie} dataKey="value" nameKey="label" innerRadius={60} outerRadius={95} paddingAngle={2}>{pickupPie.map((entry) => <Cell key={entry.key} fill={pickupColor[entry.key] ?? "var(--chart-5)"} />)}</Pie><Tooltip formatter={(value, _name, item) => [`${Number(value)}건`, item?.payload?.label ?? ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>}
    </section>
    <section className="dashboard-panel spaced-panel">
      <div className="panel-title-row"><div><p>PICKUP OPERATIONS</p><h2>판매자 픽업 조회</h2></div><StatusBadge type="live">관리자 운영 장소</StatusBadge></div>
      <div className="operation-grid">{locations.map((location) => <article key={location.id}><strong>{location.name}</strong><small>{location.address}</small></article>)}</div>
      <div className="operation-list">{slots.map((slot) => <article className="compact-row" key={slot.id}><span>{slot.pickupDate} {slot.startTime}–{slot.endTime}</span><strong>{slot.reservedCount}/{slot.capacity}명</strong></article>)}</div>
    </section>
  </>;
}

function InquiriesPanel() {
  const [items, setItems] = useState<Inquiry[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [replies, setReplies] = useState<Record<string, string>>({}); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); const result = await getSellerInquiries(); setLoading(false); if (result.ok) setItems(result.data?.inquiries ?? []); else setError(result.error?.message ?? "문의를 불러오지 못했습니다."); }, []); useEffect(() => { void load(); }, [load]);
  const reply = async (id: string) => { const message = replies[id]?.trim(); if (!message) return; setBusy(id); const result = await replySellerInquiry(id, message); setBusy(null); if (!result.ok) return setError(result.error?.message ?? "답변을 저장하지 못했습니다."); setReplies((current) => ({ ...current, [id]: "" })); setNotice("문의 답변을 저장했습니다."); await load(); };
  if (loading) return <Loading text="담당 문의를 불러오는 중입니다." />;
  return <section className="dashboard-panel"><div className="panel-title-row"><div><p>SELLER INQUIRIES</p><h2>배정 문의 대화</h2></div><StatusBadge type="live">담당 문의만 표시</StatusBadge></div><Feedback error={error} notice={notice} />{items.length === 0 ? <Empty title="담당 문의가 없습니다." text="상품 문의가 배정되면 표시됩니다." /> : <div className="conversation-list">{items.map((item) => <article key={item.id}><header><strong>{item.subject}</strong><StatusBadge type="ready">{item.status}</StatusBadge></header><div className="message-list">{(item.inquiry_messages ?? []).map((message) => <p key={message.id}><span>{message.message}</span><small>{date(message.created_at)}</small></p>)}</div><div className="reply-row"><textarea value={replies[item.id] ?? ""} onChange={(event) => setReplies({ ...replies, [item.id]: event.target.value })} aria-label={`${item.subject} 답변`} /><button className="primary-button" disabled={busy === item.id || !(replies[item.id]?.trim())} onClick={() => void reply(item.id)}><Send size={15} /> 답변</button></div></article>)}</div>}</section>;
}

export default function SellerPage() {
  const path = useLocation().pathname; const [title, description] = info[path] ?? info["/seller"];
  const panel = path === "/seller" ? <DashboardPanel /> : path === "/seller/products/new" ? <ProductForm /> : path === "/seller/products" ? <ProductsPanel /> : path === "/seller/orders" ? <FulfillmentsPanel /> : path === "/seller/analytics" ? <AnalyticsPanel /> : <InquiriesPanel />;
  return <DashboardShell type="seller"><div className="dashboard-page-heading"><div><p>판매자 기능</p><h1>{title}</h1><span>{description}</span></div><StatusBadge type="live">운영 API 연결</StatusBadge></div><div className="dashboard-content">{panel}</div></DashboardShell>;
}
