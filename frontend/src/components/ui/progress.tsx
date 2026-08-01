/**
 * 타임딜 달성률이나 처리 진행 상태를 막대로 시각화합니다.
 * 고객·판매자·관리자 pages와 shared 레이아웃이 Radix 기반 접근성 동작을 재사용합니다.
 * 스타일 변형과 ref 전달을 유지하고 비즈니스 API 호출은 포함하지 않습니다.
 */
import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
