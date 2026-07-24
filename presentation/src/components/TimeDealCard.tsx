import { Clock, MapPin, ShoppingBag } from 'lucide-react'
import { useCountdown } from '../hooks/useCountdown'
import StockGaugeBar from './StockGaugeBar'
import type { TimeDeal } from '../data/mockDeals'

interface Props {
  deal: TimeDeal
  compact?: boolean
}

export default function TimeDealCard({ deal, compact }: Props) {
  const { formatted, isExpired } = useCountdown(deal.expiresAt)
  const isSoldOut = deal.remainingStock === 0
  const inactive = isExpired || isSoldOut

  return (
    <div className="border rounded-[22px] overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col" style={{ background: 'rgba(23,25,29,0.82)', backdropFilter: 'blur(20px)', borderColor: '#2a2d33' }}>
      {/* Product Image */}
      <div className={`relative overflow-hidden ${compact ? 'h-36' : 'h-52'}`}>
        <img
          src={deal.imageUrl}
          alt={deal.productTitle}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => {
            const el = e.currentTarget
            el.style.display = 'none'
            const parent = el.parentElement
            if (parent) parent.style.background = 'linear-gradient(135deg, #1f2937, #111827)'
          }}
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* LIMITED TIME badge */}
        <div className={`absolute top-3 left-3 bg-gradient-to-r ${deal.badgeColor} text-white text-[9px] font-black px-2.5 py-1 rounded-full tracking-widest shadow-lg`}>
          LIMITED TIME
        </div>

        {/* Discount badge */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white font-black px-2.5 py-1 rounded-xl border border-white/10 text-sm">
          -{deal.discountPercent}%
        </div>
      </div>

      {/* Timer Banner */}
      <div className={`flex items-center justify-center gap-2 px-4 ${compact ? 'py-2' : 'py-2.5'} ${isExpired ? 'bg-[#1a1c20]' : 'border-t border-b border-orange-500/30'}`} style={isExpired ? {} : { background: 'rgba(23,25,29,0.9)' }}>
        <Clock size={13} className={isExpired ? 'text-gray-500' : 'text-orange-400'} />
        <span className={`font-mono font-bold tracking-widest ${compact ? 'text-sm' : 'text-base'} ${isExpired ? 'text-gray-500' : 'text-orange-400'}`}>
          {isExpired ? '종료됨' : formatted}
        </span>
        {!isExpired && <span className="text-gray-500 text-xs">남음</span>}
      </div>

      {/* Body */}
      <div className={`flex flex-col flex-1 ${compact ? 'gap-2 p-3' : 'gap-3 p-4'}`}>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <MapPin size={10} />
          <span className="truncate">{deal.shopName}</span>
        </div>
        <h3 className={`text-white font-bold leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>{deal.productTitle}</h3>
        <div className="flex items-end gap-2">
          <span className={`font-black text-white ${compact ? 'text-xl' : 'text-2xl'}`}>{deal.salePrice.toLocaleString()}원</span>
          <span className="text-gray-500 text-xs line-through mb-0.5">{deal.originalPrice.toLocaleString()}원</span>
        </div>
        <StockGaugeBar total={deal.totalStock} remaining={deal.remainingStock} />
        <button
          disabled={inactive}
          className={`w-full mt-auto rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all duration-200
            ${compact ? 'py-2 text-xs' : 'py-3 text-sm'}
            ${inactive
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 active:scale-95 shadow-lg shadow-orange-500/20'
            }`}
        >
          <ShoppingBag size={compact ? 13 : 15} />
          {isSoldOut ? '품절' : isExpired ? '딜 종료' : '지금 예약하기'}
        </button>
      </div>
    </div>
  )
}
