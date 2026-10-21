/**
 * 픽업 슬롯이 모두 지나가 버리면 웹 결제와 모바일 예약이 막히므로, 남은 슬롯이 없을 때
 * 앞으로 며칠치 기본 슬롯(아침·점심·저녁, KST)을 자동으로 만들어 둡니다.
 */
import { getAdminSupabase } from "./supabase.js";

const DAILY_WINDOWS = [
  { start: "07:00", end: "09:00" },
  { start: "12:00", end: "14:00" },
  { start: "18:00", end: "21:00" },
];
const DAYS_AHEAD = 3;
const CAPACITY = 50;

const kstDate = (offsetDays: number) => {
  const now = new Date(Date.now() + 9 * 3600_000 + offsetDays * 86400_000);
  return now.toISOString().slice(0, 10);
};

export type PickupSlotRow = { id: string; location_id: string; pickup_at: string; [key: string]: unknown };

export async function ensureUpcomingSlots(locationId: string): Promise<PickupSlotRow[]> {
  const supabase = getAdminSupabase();
  const nowIso = new Date().toISOString();
  const select = () => supabase.from("pickup_slots").select("*").eq("location_id", locationId).eq("is_active", true).gt("pickup_at", nowIso).order("pickup_at");
  const { data: existing, error } = await select();
  if (error) throw error;
  if (existing && existing.length > 0) return existing as PickupSlotRow[];

  const rows = [];
  for (let day = 0; day <= DAYS_AHEAD; day += 1) {
    const date = kstDate(day);
    for (const window of DAILY_WINDOWS) {
      const pickupAt = new Date(`${date}T${window.start}:00+09:00`);
      if (pickupAt.getTime() <= Date.now()) continue;
      rows.push({ location_id: locationId, pickup_date: date, start_time: window.start, end_time: window.end, pickup_at: pickupAt.toISOString(), capacity: CAPACITY, is_active: true });
    }
  }
  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("pickup_slots").insert(rows);
    if (insertError) throw insertError;
  }
  const { data: created } = await select();
  return (created ?? []) as PickupSlotRow[];
}
