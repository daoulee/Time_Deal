/**
 * live·ready·mock 상태를 색상과 문구로 구분해 표시합니다.
 * 고객·판매자·관리자 화면이 연동 수준을 명확하게 안내할 때 사용합니다.
 * 개발 fixture를 운영 데이터처럼 보이게 하는 문구로 바꾸지 않아야 합니다.
 */
import { cn } from "@/lib/utils";

export function StatusBadge({ type = "mock", children }: { type?: "mock" | "ready" | "live"; children?: React.ReactNode }) {
  const label = children ?? (type === "mock" ? "개발 데이터" : type === "ready" ? "처리 대기" : "운영 중");
  return <span className={cn("status-badge", type === "ready" && "status-badge-ready", type === "live" && "status-badge-live")}>{label}</span>;
}
