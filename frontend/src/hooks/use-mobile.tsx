/**
 * 현재 뷰포트가 모바일 기준인지 반응형으로 감지하는 공통 훅입니다.
 * 사이드바·드로어·대시보드 레이아웃이 화면 크기에 맞는 UI를 선택할 때 사용합니다.
 * 브라우저 media query 구독을 해제해 리스너 누수를 방지합니다.
 */
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
