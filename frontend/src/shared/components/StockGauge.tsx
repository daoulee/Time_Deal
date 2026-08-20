/**
 * 참여 인원 대비 목표 인원 진행률을 막대로 보여줍니다.
 * 이 서비스에서 100% 달성은 재고 소진이 아니라 공동구매 성공을 뜻하므로
 * 회색으로 바꾸지 않고 더 진한 브랜드 색으로 강조합니다.
 */
export function StockGauge({ participants, target }: { participants: number; target: number }) {
  const progress = target > 0 ? Math.min(100, Math.round((participants / target) * 100)) : 0;
  return (
    <div className={`deal-stock-gauge${progress >= 100 ? " is-complete" : ""}`}>
      <div className="deal-stock-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`목표 달성률 ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
