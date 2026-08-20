/**
 * useCountdown 결과를 시계 아이콘과 함께 표시하는 공용 카운트다운 UI입니다.
 * Deal Card·홈 히어로·상품 상세가 같은 긴급도 색상 규칙(정상→주의→위험)을 공유합니다.
 */
import { Clock3 } from "lucide-react";
import { useCountdown } from "@/shared/hooks/useCountdown";

export function CountdownTimer({ endsAtIso, fallbackLabel, tone = "default" }: { endsAtIso?: string; fallbackLabel: string; tone?: "default" | "onDark" }) {
  const { label, mode, urgency } = useCountdown(endsAtIso, fallbackLabel);
  const suffix = mode === "expired" ? "expired" : mode === "live" ? urgency : "normal";
  const text = mode === "expired" ? "마감" : mode === "live" ? `${label} 남음` : `${label} 마감`;
  return (
    <span className={`deal-countdown deal-countdown-${suffix}${tone === "onDark" ? " deal-countdown-on-dark" : ""}`}>
      <Clock3 size={13} /> {text}
    </span>
  );
}
