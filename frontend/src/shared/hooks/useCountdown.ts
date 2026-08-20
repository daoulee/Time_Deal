/**
 * 종료 시각(ISO)이 있으면 1초마다 남은 시간을 계산해 표시 문구와 긴급도를 반환합니다.
 * ISO가 없거나 24시간 넘게 남았을 때는 날짜 라벨을 그대로 보여주고 초 단위로 갱신하지 않습니다.
 * Deal Card·홈 히어로·상품 상세가 이 훅 하나로 동일한 카운트다운 상태를 공유합니다.
 */
import { useEffect, useState } from "react";

export type CountdownMode = "date" | "live" | "expired";
export type CountdownUrgency = "normal" | "warning" | "danger";
export type CountdownState = { label: string; mode: CountdownMode; urgency: CountdownUrgency };

const HOUR_MS = 3_600_000;
const pad = (value: number) => String(value).padStart(2, "0");

function computeState(endsAtIso: string | undefined, fallbackLabel: string): CountdownState {
  const endsAt = endsAtIso ? new Date(endsAtIso).getTime() : NaN;
  if (Number.isNaN(endsAt)) return { label: fallbackLabel, mode: "date", urgency: "normal" };
  const remaining = endsAt - Date.now();
  if (remaining <= 0) return { label: "마감", mode: "expired", urgency: "danger" };
  if (remaining > 24 * HOUR_MS) return { label: fallbackLabel, mode: "date", urgency: "normal" };
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const label = hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  const urgency: CountdownUrgency = remaining <= 10 * 60_000 ? "danger" : remaining <= HOUR_MS ? "warning" : "normal";
  return { label, mode: "live", urgency };
}

export function useCountdown(endsAtIso: string | undefined, fallbackLabel: string): CountdownState {
  const [state, setState] = useState(() => computeState(endsAtIso, fallbackLabel));
  useEffect(() => {
    setState(computeState(endsAtIso, fallbackLabel));
    const id = window.setInterval(() => setState(computeState(endsAtIso, fallbackLabel)), 1000);
    return () => window.clearInterval(id);
  }, [endsAtIso, fallbackLabel]);
  return state;
}
