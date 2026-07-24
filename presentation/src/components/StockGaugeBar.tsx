interface Props {
  total: number
  remaining: number
}

export default function StockGaugeBar({ total, remaining }: Props) {
  const pct = Math.round((remaining / total) * 100)
  const isUrgent = pct <= 20
  const isLow = pct <= 50

  const barColor = isUrgent
    ? 'from-red-500 to-orange-500'
    : isLow
      ? 'from-orange-400 to-yellow-400'
      : 'from-green-400 to-emerald-500'

  const textColor = isUrgent ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-green-400'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className={`font-bold ${textColor}`}>
          {isUrgent ? `⚠️ 잔여 ${remaining}개!` : `남은 수량 ${remaining}개`}
        </span>
        <span className="text-gray-500">{total}개 한정</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
