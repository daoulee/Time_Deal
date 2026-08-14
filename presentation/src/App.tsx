import Lenis from 'lenis'
import { useState, useEffect, useRef, type ReactNode } from 'react'

// ─── Lenis Smooth Scroll ──────────────────────────────────────────────────────
function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4) })
    let id: number
    function raf(time: number) { lenis.raf(time); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(id); lenis.destroy() }
  }, [])
}

// ─── Character Split Reveal ───────────────────────────────────────────────────
function CharReveal({
  lines, visible, baseDelay = 0, stagger = 26, style = {},
}: {
  lines: string[]; visible: boolean; baseDelay?: number; stagger?: number; style?: React.CSSProperties
}) {
  let charCount = 0
  return (
    <span style={style}>
      {lines.map((line, lineIdx) => (
        <span key={lineIdx} style={{ display: 'block' }}>
          {line.split('').map((char) => {
            const idx = charCount++
            return (
              <span key={idx} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}>
                <span style={{
                  display: 'inline-block',
                  transform: visible ? 'translateY(0)' : 'translateY(108%)',
                  transition: `transform 0.82s cubic-bezier(0.16,1,0.3,1) ${baseDelay + idx * stagger}ms`,
                }}>
                  {char === ' ' ? ' ' : char}
                </span>
              </span>
            )
          })}
        </span>
      ))}
    </span>
  )
}

// ─── Scroll Reveal ────────────────────────────────────────────────────────────
function useReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold },
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({ children, delay = 0, style = {} }: {
  children: ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(44px)',
      transition: `opacity 0.88s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms,
                   transform 0.88s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Scramble Nav Link ────────────────────────────────────────────────────────
const SCRAMBLE_CHARS = '!@#%^&*<>?/|~'

function ScrambleLink({ label, href, color, weight = 400 }: {
  label: string; href: string; color: string; weight?: number
}) {
  const [display, setDisplay] = useState(label)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const scramble = () => {
    if (timer.current) clearInterval(timer.current)
    let frame = 0
    const totalFrames = label.length * 3
    timer.current = setInterval(() => {
      setDisplay(
        label.split('').map((char, i) => {
          if (char === ' ') return ' '
          if (frame / 3 > i) return char
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        }).join('')
      )
      frame++
      if (frame >= totalFrames) {
        setDisplay(label)
        if (timer.current) clearInterval(timer.current)
      }
    }, 35)
  }

  const reset = () => {
    if (timer.current) clearInterval(timer.current)
    setDisplay(label)
  }

  return (
    <a
      href={href}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      style={{
        fontSize: 13, fontWeight: weight, textDecoration: 'none',
        color, letterSpacing: '0.01em', fontFamily: 'monospace',
        minWidth: `${label.length}ch`,
        display: 'inline-block',
      }}
    >
      {display}
    </a>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > window.innerHeight * 0.65)
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const fg = scrolled ? '#0a0a0a' : '#ffffff'
  const fgMuted = scrolled ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)'

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 64px', height: 60,
      background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : 'none',
      transition: 'background 0.45s ease, border-color 0.45s ease',
    }}>
      <ScrambleLink label="타임딜®" href="#" color={fg} weight={900} />
      <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {['서비스', '기능', '데모', '기술', '팀'].map((label, i) => (
          <ScrambleLink
            key={label}
            label={label}
            href={`#${['meet', 'features', 'demo', 'tech', 'team'][i]}`}
            color={fgMuted}
          />
        ))}
      </nav>
      <ScrambleLink label="발표 보기" href="#cta" color={fg} weight={600} />
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 120); return () => clearTimeout(t) }, [])

  return (
    <section style={{
      minHeight: '100vh', background: '#0a0a0a',
      backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&auto=format&q=55)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      position: 'relative', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '80px 64px 68px', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.80)' }} />

      {/* Top badge */}
      <div style={{
        position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(-10px)',
        transition: 'opacity 0.7s ease 0.05s, transform 0.7s ease 0.05s',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999, padding: '7px 16px',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF4500', display: 'inline-block', boxShadow: '0 0 8px #FF4500' }} />
          SW학부 해커톤 2026 &nbsp;·&nbsp; 08.20 – 08.22
        </span>
      </div>

      {/* Bottom */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 15,
          letterSpacing: '-0.01em', margin: '0 0 22px', fontWeight: 400,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.75s ease 0.55s',
        }}>
          동네 소상공인과 주민을 연결하는 하이퍼로컬 플래시 세일 플랫폼
        </p>
        <h1 style={{
          color: '#ffffff',
          fontSize: 'clamp(72px, 12vw, 176px)',
          fontWeight: 900, lineHeight: 0.86,
          letterSpacing: '-0.035em', textTransform: 'uppercase', margin: 0,
        }}>
          <CharReveal lines={['우리 동네', '타임딜.']} visible={mounted} baseDelay={200} stagger={28} />
        </h1>
      </div>
    </section>
  )
}

// ─── Meet (01) ────────────────────────────────────────────────────────────────
function MeetSection() {
  const { ref: headRef, visible: headVisible } = useReveal(0.1)

  return (
    <section id="meet" style={{ background: '#fff', padding: '96px 64px 96px' }}>

      {/* ── Row 1: Heading (left) + Description & Stats (right) ── */}
      <div style={{ display: 'flex', gap: 64, alignItems: 'flex-start', marginBottom: 64 }}>

        {/* Left — label + big heading */}
        <div style={{ flex: '0 0 52%' }}>
          <Reveal>
            <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', display: 'block', marginBottom: 28 }}>
              01 — 서비스 소개
            </span>
          </Reveal>
          <div ref={headRef}>
            <h2 style={{ fontSize: 'clamp(40px, 6.5vw, 96px)', fontWeight: 900, lineHeight: 0.87, letterSpacing: '-0.03em', textTransform: 'uppercase', margin: 0, color: '#0a0a0a' }}>
              <CharReveal lines={['소상공인의', '재고 손실을', '없애는 한 방.']} visible={headVisible} stagger={22} />
            </h2>
          </div>
        </div>

        {/* Right — description + stats */}
        <div style={{ flex: 1, paddingTop: 32 }}>
          <Reveal delay={80}>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: '#444', margin: '0 0 20px', fontWeight: 400 }}>
              국내 식품 자영업자의 <strong style={{ color: '#0a0a0a' }}>일평균 폐기 손실액은 4.2만 원</strong>입니다.
              유통기한 임박 재고를 당일에 소진할 채널이 없기 때문입니다.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: '#444', margin: '0 0 28px', fontWeight: 400 }}>
              우리 동네 타임딜은 이 간극을 메웁니다 — 마감 임박 상품을
              초 단위 카운트다운과 재고 게이지로 시각화해 반경 1km 주민에게 실시간으로 전달합니다.
            </p>
            <div style={{ display: 'flex', gap: 40 }}>
              {[
                { value: '4.2만원', label: '일평균 폐기 손실액' },
                { value: '50%+', label: '최대 할인율' },
                { value: '0개', label: '국내 전용 선행 앱' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em', color: '#0a0a0a' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── Row 2: Image (left) + How it works (right) ── */}
      <Reveal delay={120}>
        <div style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>

          {/* Image */}
          <div style={{ width: 340, height: 420, flexShrink: 0, overflow: 'hidden', background: '#f0f0ee' }}>
            <img
              src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=960&fit=crop&auto=format&q=80"
              alt="market"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            />
          </div>

          {/* How it works */}
          <div style={{ flex: 1, paddingTop: 28 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 24px' }}>
              HOW IT WORKS
            </p>
            {[
              { step: '01', title: '가게가 딜 등록', desc: '상품명 · 할인율 · 마감 시간을 30초 안에 입력' },
              { step: '02', title: '앱에 실시간 노출', desc: '반경 1km 주민에게 즉시 피드 & 푸시 알림 발송' },
              { step: '03', title: '1-탭 예약 & 픽업', desc: '예약 버튼 하나로 완료, 마감 전 가게에서 수령' },
            ].map((s) => (
              <div key={s.step} style={{
                display: 'flex', gap: 24, alignItems: 'flex-start',
                padding: '22px 0',
                borderTop: '1px solid #efefef',
              }}>
                <span style={{ fontWeight: 900, fontSize: 11, color: '#d0d0d0', flex: '0 0 20px', letterSpacing: '0.05em', paddingTop: 3 }}>{s.step}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0a0a0a', marginBottom: 5 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
                <span style={{ fontSize: 18, color: '#e0e0e0', paddingTop: 2, flexShrink: 0 }}>→</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #efefef', paddingTop: 32, marginTop: 4 }}>
              <a href="#features" style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', textDecoration: 'underline', textUnderlineOffset: 5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                핵심 기능 보기 →
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}


// ─── Screenshot / GIF Display ────────────────────────────────────────────────
function PhoneScreenshot({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)
  return (
    <div style={{
      width: 300,
      background: '#0f1014',
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      minHeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {!error ? (
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          style={{ width: '100%', display: 'block' }}
        />
      ) : (
        <div style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📸</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 10 }}>
            스크린샷을 여기에 추가하세요
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 6 }}>
            public{src}
          </div>
        </div>
      )}
    </div>
  )
}

function GifDisplay({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)
  return error ? (
    <div style={{
      width: '100%', maxWidth: 680,
      background: 'rgba(255,255,255,0.03)',
      border: '1px dashed rgba(255,255,255,0.12)',
      borderRadius: 16, padding: '48px 32px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>🎬</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 12 }}>
        실시간 동기화 화면녹화를 여기에 추가하세요
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 6, display: 'inline-block' }}>
        public{src}
      </div>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      style={{ width: '100%', maxWidth: 680, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'block' }}
    />
  )
}

// ─── Features Section (02) ───────────────────────────────────────────────────
interface Feature {
  id: string; name: string; index: string; desc: string; longDesc: string; tags: string[]
}

const FEATURE_UI: Record<string, ReactNode> = {
  feed:    <PhoneScreenshot src="/screens/feed.png"    alt="타임딜 피드" />,
  timer:   <PhoneScreenshot src="/screens/timer.png"   alt="카운트다운 타이머" />,
  stock:   <PhoneScreenshot src="/screens/stock.png"   alt="재고 게이지" />,
  reserve: <PhoneScreenshot src="/screens/reserve.png" alt="원터치 예약" />,
  map:     <PhoneScreenshot src="/screens/map.png"     alt="지도 & 마커" />,
  upload:  <PhoneScreenshot src="/screens/upload.png"  alt="이미지 업로드" />,
  gps:     <PhoneScreenshot src="/screens/gps.png"     alt="GPS 거리 정렬" />,
}

const FEATURES: Feature[] = [
  {
    id: 'feed', name: '타임딜 피드', index: '01', tags: ['REAL-TIME', 'HYPERLOCAL'],
    desc: '현재 진행 중인 동네 한정딜을 실시간 카드 목록으로 표시합니다.',
    longDesc: '반경 1km 이내 진행 중인 타임딜을 실시간 카드 목록으로 표시합니다. 위치 기반 필터링으로 진짜 내 동네 딜만 노출되며, 남은 시간·할인율·재고 수를 한눈에 파악할 수 있습니다. HOT 뱃지로 인기 딜을 즉시 식별하고, "마감 임박" 탭 전환으로 긴박감을 극대화합니다.',
  },
  {
    id: 'timer', name: '카운트다운', index: '02', tags: ['URGENCY', 'LIVE'],
    desc: '초 단위 실시간 타이머. 딜 종료 시 버튼이 자동으로 비활성화됩니다.',
    longDesc: '딜 종료까지 남은 시간을 시:분:초 단위로 실시간 표시합니다. 시각적 긴박감(urgency)이 즉각적인 구매 결정을 이끌어냅니다. 타이머가 만료되면 예약 버튼이 자동 비활성화되어 딜 종료 상태를 명확히 전달하고, 딜 진행률 게이지가 시간 흐름을 시각적으로 보조합니다.',
  },
  {
    id: 'stock', name: '재고 게이지', index: '03', tags: ['SCARCITY', 'VISUAL'],
    desc: '잔여 재고 비율에 따라 초록→주황→빨강 색상이 자동 변환됩니다.',
    longDesc: '잔여 재고 수량에 따라 게이지 색상이 자동 변환됩니다. 여유(초록) → 주의(주황) → 위험(빨강)으로 직관적으로 희소성을 시각화합니다. 재고 소진이 임박할수록 심리적 긴장감을 유발해 전환율을 높이며, 실시간으로 모든 딜의 재고 현황을 한 화면에서 비교할 수 있습니다.',
  },
  {
    id: 'reserve', name: '원터치 예약', index: '04', tags: ['1-TAP', 'INSTANT'],
    desc: '"지금 예약하기" 탭 한 번으로 완료. 최소한의 단계로 즉각적 구매 경험.',
    longDesc: '"지금 예약하기" 버튼 한 번으로 예약이 완료됩니다. 이름·픽업 시간·결제 방식이 자동 입력되어 마찰(friction) 없는 즉각적 구매 경험을 제공합니다. 예약 완료 후 지정 시간 내에 매장을 방문해 수령하면 되며, 별도 결제 없이 현장 결제로 간소화됩니다.',
  },
  {
    id: 'map', name: '지도 & 마커', index: '05', tags: ['GOOGLE MAPS', 'LOCATION'],
    desc: '할인율(%) 커스텀 마커로 근처 딜 위치를 지도에서 한눈에 파악합니다.',
    longDesc: 'Google Maps 위에 할인율 % 텍스트가 담긴 커스텀 원형 마커를 렌더링합니다. 선택된 마커는 크기가 커지고 흰 테두리가 나타나며, 해당 딜 카드가 슬라이드업 애니메이션으로 표시됩니다. 다크모드 전용 지도 스타일을 JSON으로 적용해 앱 테마와 통일감을 줍니다. `dart:ui` Canvas와 `BitmapDescriptor.bytes()`를 사용해 마커를 직접 렌더링합니다.',
  },
  {
    id: 'upload', name: '이미지 업로드', index: '06', tags: ['SUPABASE STORAGE', 'PHOTO'],
    desc: '딜 등록 시 상품 사진을 촬영하거나 갤러리에서 선택해 업로드합니다.',
    longDesc: '`image_picker`로 카메라·갤러리에서 선택한 이미지를 Supabase Storage `deal-images` 버킷에 직접 업로드합니다. 업로드 완료 후 공개 URL이 deals 테이블에 저장되어 소비자 피드 카드에 즉시 노출됩니다. 사장님은 가게 이름 · 상품명 · 할인율 · 마감 시간을 30초 안에 입력하고 딜 등록을 완료할 수 있습니다.',
  },
  {
    id: 'gps', name: 'GPS 거리 정렬', index: '07', tags: ['GPS', 'HAVERSINE'],
    desc: '기기 GPS로 실거리를 계산해 가까운 딜부터 자동 정렬합니다.',
    longDesc: '`geolocator`로 취득한 GPS 좌표와 각 딜의 위치를 Haversine 공식으로 계산해 실제 직선 거리(km)를 표시합니다. 홈 피드는 거리 오름차순으로 자동 정렬되며, 카테고리 필터와 결합해도 거리 순서가 유지됩니다. 동네 설정 변경 시 지도 카메라도 해당 위치로 자동 이동합니다.',
  },
]

// ─── Feature Detail Modal ─────────────────────────────────────────────────────
function FeatureModal({ feature, onClose }: { feature: Feature | null; onClose: () => void }) {
  const [rendered, setRendered] = useState<Feature | null>(null)
  const [panelIn, setPanelIn] = useState(false)

  useEffect(() => {
    if (feature) {
      setRendered(feature)
      document.body.style.overflow = 'hidden'
      const t = setTimeout(() => setPanelIn(true), 12)
      return () => clearTimeout(t)
    } else {
      setPanelIn(false)
      document.body.style.overflow = ''
      const t = setTimeout(() => setRendered(null), 540)
      return () => clearTimeout(t)
    }
  }, [feature])

  useEffect(() => () => { document.body.style.overflow = '' }, [])

  if (!rendered) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(6px)',
        opacity: panelIn ? 1 : 0, transition: 'opacity 0.36s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 'min(800px, 94vw)', background: '#fff',
          transform: panelIn ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.52s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 48px', borderBottom: '1px solid #e8e8e8', flexShrink: 0 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#ccc', letterSpacing: '0.05em' }}>({rendered.index})</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #e0e0e0', cursor: 'pointer',
              width: 38, height: 38, borderRadius: '50%', fontSize: 20, lineHeight: 1,
              color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.22s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0a0a0a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0a0a0a' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#e0e0e0' }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '52px 48px 64px' }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
            {rendered.tags.map(t => (
              <span key={t} style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', border: '1px solid #e0e0e0', padding: '4px 12px', borderRadius: 2 }}>{t}</span>
            ))}
          </div>

          {/* Feature name */}
          <h2 style={{ fontSize: 'clamp(48px, 7.5vw, 96px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.87, textTransform: 'uppercase', color: '#0a0a0a', margin: '0 0 40px' }}>
            {rendered.name}
          </h2>

          <div style={{ height: 1, background: '#e8e8e8', marginBottom: 40 }} />

          {/* Description */}
          <p style={{ fontSize: 17, lineHeight: 1.75, color: '#444', margin: '0 0 56px' }}>
            {rendered.longDesc}
          </p>

          {/* Mock UI */}
          <div style={{ background: '#0a0a0a', borderRadius: 24, padding: '52px 40px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,69,0,0.07) 0%, transparent 68%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              {FEATURE_UI[rendered.id]}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturesSection() {
  const [openFeature, setOpenFeature] = useState<Feature | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const { ref: headRef, visible: headVisible } = useReveal(0.1)

  return (
    <>
      <section id="features" style={{ background: '#fff', borderTop: '1px solid #e8e8e8' }}>

        {/* ── Section header ── */}
        <div ref={headRef} style={{ padding: '80px 64px 68px', borderBottom: '1px solid #e8e8e8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <span style={{
                fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
                color: '#999', display: 'block', marginBottom: 20,
                opacity: headVisible ? 1 : 0, transition: 'opacity 0.7s ease',
              }}>
                02 — 핵심 기능
              </span>
              <p style={{
                fontSize: 16, color: '#777', maxWidth: 300, lineHeight: 1.65, margin: 0,
                opacity: headVisible ? 1 : 0, transition: 'opacity 0.7s ease 0.1s',
              }}>
                긴박감(urgency) 기반 UX로<br />즉각적인 구매 결정을 이끌어냅니다.
              </p>
            </div>
            <h2 style={{
              fontSize: 'clamp(52px, 8.5vw, 128px)', fontWeight: 900,
              letterSpacing: '-0.035em', lineHeight: 0.87,
              textTransform: 'uppercase', margin: 0, color: '#0a0a0a',
            }}>
              <CharReveal lines={['선택된', '기능들']} visible={headVisible} stagger={30} />
            </h2>
          </div>
        </div>

        {/* ── Full-width clickable rows ── */}
        {FEATURES.map((f) => (
          <div
            key={f.id}
            onClick={() => setOpenFeature(f)}
            onMouseEnter={() => setHovered(f.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 24,
              padding: '30px 64px',
              borderBottom: '1px solid #e8e8e8',
              cursor: 'pointer',
              background: hovered === f.id ? '#0a0a0a' : 'transparent',
              transition: 'background 0.28s ease',
            }}
          >
            <span style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
              color: hovered === f.id ? 'rgba(255,255,255,0.3)' : '#ccc',
              flex: '0 0 40px', transition: 'color 0.28s',
            }}>
              ({f.index})
            </span>
            <span style={{
              fontSize: 'clamp(36px, 5.5vw, 80px)',
              fontWeight: 900, letterSpacing: '-0.025em',
              textTransform: 'uppercase', lineHeight: 1,
              color: hovered === f.id ? '#ffffff' : '#0a0a0a',
              flex: 1, transition: 'color 0.28s',
            }}>
              {f.name}
            </span>
            <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
              {f.tags.map(t => (
                <span key={t} style={{
                  fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: hovered === f.id ? 'rgba(255,255,255,0.28)' : '#bbb',
                  transition: 'color 0.28s',
                }}>{t}</span>
              ))}
            </div>
            <span style={{
              fontSize: 22, flexShrink: 0, marginLeft: 16,
              color: hovered === f.id ? '#ffffff' : '#ccc',
              display: 'inline-block',
              transform: hovered === f.id ? 'rotate(-45deg) translateX(3px)' : 'none',
              transition: 'all 0.28s ease',
            }}>→</span>
          </div>
        ))}
      </section>

      <FeatureModal feature={openFeature} onClose={() => setOpenFeature(null)} />
    </>
  )
}

// ─── Live Demo ────────────────────────────────────────────────────────────────
function LiveDemoSection() {
  return (
    <section id="demo" style={{ background: '#0a0a0a', padding: '96px 64px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <Reveal>
        <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 16 }}>
          LIVE DEMO — 실시간 동기화
        </span>
        <h2 style={{ fontSize: 'clamp(40px, 6vw, 88px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.87, textTransform: 'uppercase', color: '#fff', margin: '0 0 72px' }}>
          등록하면, 즉시<br />반영됩니다.
        </h2>
      </Reveal>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GifDisplay src="/screens/realtime-sync.gif" alt="사장님 딜 등록 → 소비자 피드 실시간 반영" />
      </div>

      <Reveal delay={200}>
        <div style={{ display: 'flex', marginTop: 72, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { step: '01', title: '사장님 딜 등록', desc: '사진 + 가격 + 마감 시간을 30초 안에 입력' },
            { step: '02', title: 'Supabase Realtime', desc: 'WebSocket으로 즉시 모든 구독자에게 브로드캐스트' },
            { step: '03', title: '소비자 피드 업데이트', desc: '앱 재시작 없이 새 딜이 홈 피드에 실시간 반영' },
          ].map((s, i) => (
            <div key={s.step} style={{ flex: 1, paddingTop: 32, paddingRight: i < 2 ? 32 : 0, paddingLeft: i > 0 ? 32 : 0, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 10, letterSpacing: '0.05em' }}>{s.step}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

// ─── Architecture ─────────────────────────────────────────────────────────────
function ArchSection() {
  return (
    <section style={{ background: '#fff', padding: '96px 64px', borderTop: '1px solid #e8e8e8' }}>
      <Reveal>
        <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', display: 'block', marginBottom: 16 }}>
          시스템 아키텍처
        </span>
        <h2 style={{ fontSize: 'clamp(36px, 5.5vw, 80px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.87, textTransform: 'uppercase', color: '#0a0a0a', margin: '0 0 64px' }}>
          기술 구조
        </h2>
      </Reveal>

      <Reveal delay={100}>
        <div style={{ background: '#0a0a0a', borderRadius: 20, padding: '48px', display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 24, alignItems: 'center' }}>
          {/* Left: Client */}
          <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '24px 28px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>CLIENT</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 6 }}>📱 Flutter — 소비자</div>
              {['Provider · geolocator', 'google_maps_flutter', 'Haversine 거리 계산'].map(t => (
                <div key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', paddingLeft: 16, lineHeight: 1.8, fontFamily: 'monospace' }}>{t}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 6 }}>📱 Flutter — 사장님</div>
              {['Provider · image_picker', '딜 등록 · 대시보드', '픽업 확인 관리'].map(t => (
                <div key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', paddingLeft: 16, lineHeight: 1.8, fontFamily: 'monospace' }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Center: arrows */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            {[
              { label: 'REST API', color: 'rgba(255,255,255,0.3)', dir: '→' },
              { label: 'Realtime WS', color: '#FF4500', dir: '⇄' },
              { label: 'Storage', color: 'rgba(255,255,255,0.3)', dir: '→' },
            ].map(a => (
              <div key={a.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, color: a.color, marginBottom: 2 }}>{a.dir}</div>
                <div style={{ fontSize: 9, color: a.color, letterSpacing: '0.08em', fontFamily: 'monospace' }}>{a.label}</div>
              </div>
            ))}
          </div>

          {/* Right: Supabase */}
          <div style={{ border: '1px solid rgba(255,69,0,0.25)', borderRadius: 14, padding: '24px 28px', background: 'rgba(255,69,0,0.03)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,69,0,0.5)', marginBottom: 20 }}>SUPABASE</div>
            {[
              { icon: '🗄️', name: 'PostgreSQL', lines: ['deals · reservations', 'wishlists · RLS 정책'] },
              { icon: '⚡', name: 'Realtime', lines: ['WebSocket 구독', '즉시 양방향 동기화'] },
              { icon: '🖼️', name: 'Storage', lines: ['deal-images 버킷 (Public)', '이미지 업로드 · URL 저장'] },
            ].map(item => (
              <div key={item.name} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 4 }}>{item.icon} {item.name}</div>
                {item.lines.map(l => (
                  <div key={l} style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', paddingLeft: 20, lineHeight: 1.8, fontFamily: 'monospace' }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// ─── Tech Stack (03) ─────────────────────────────────────────────────────────
// ↓ 프로젝트 카드 데이터 — 팀이 만든 실제 프로젝트로 업데이트해주세요
const TEAM_PROJECTS = [
  {
    name: 'GreenVision',
    year: '2026',
    tag: 'Capstone',
    desc: 'AI 반도체 공정 안전 모니터링 데스크톱 앱',
    img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=480&h=640&fit=crop&auto=format&q=75',
  },
  {
    name: '우리 동네 타임딜',
    year: '2026',
    tag: 'SW 해커톤',
    desc: '하이퍼로컬 플래시 세일 플랫폼',
    img: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=480&h=640&fit=crop&auto=format&q=75',
  },
  {
    name: '프로젝트명',   // ← 팀원 프로젝트로 교체
    year: '2025',
    tag: 'Team Project',
    desc: '프로젝트 한 줄 설명을 입력하세요',
    img: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=480&h=640&fit=crop&auto=format&q=75',
  },
  {
    name: '프로젝트명',
    year: '2025',
    tag: 'Personal',
    desc: '프로젝트 한 줄 설명을 입력하세요',
    img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=480&h=640&fit=crop&auto=format&q=75',
  },
  {
    name: '프로젝트명',
    year: '2024',
    tag: 'Team Project',
    desc: '프로젝트 한 줄 설명을 입력하세요',
    img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=480&h=640&fit=crop&auto=format&q=75',
  },
  {
    name: '프로젝트명',
    year: '2024',
    tag: 'Personal',
    desc: '프로젝트 한 줄 설명을 입력하세요',
    img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=480&h=640&fit=crop&auto=format&q=75',
  },
]

function TechSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const doubled = [...TEAM_PROJECTS, ...TEAM_PROJECTS]

  return (
    <section id="tech" style={{ background: '#fff', borderTop: '1px solid #e8e8e8' }}>

      {/* ── Header ── */}
      <div style={{ padding: '96px 64px 72px' }}>
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', display: 'block', marginBottom: 16 }}>
                03 — 팀 작업물
              </span>
              <p style={{ fontSize: 16, color: '#777', maxWidth: 320, lineHeight: 1.65, margin: 0 }}>
                Flutter · Supabase · google_maps_flutter · geolocator<br />— 검증된 스택으로 완성한 결과물들.
              </p>
            </div>
            <p style={{ fontSize: 14, color: '#bbb', maxWidth: 260, lineHeight: 1.7, margin: 0, textAlign: 'right' }}>
              3일 해커톤을 위한 스택 — 모두 무료 플랜 내에서 동작하며<br />팀원 전원이 사전 경험 있는 기술만 선정했습니다.
            </p>
          </div>
        </Reveal>
      </div>

      {/* ── Project conveyor rail ── */}
      <div
        style={{ background: '#0a0a0a', padding: '48px 0 52px', overflow: 'hidden' }}
        onMouseEnter={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused' }}
        onMouseLeave={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running' }}
      >
        {/* Small label */}
        <div style={{ padding: '0 32px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Projects ({TEAM_PROJECTS.length})</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <div
          ref={trackRef}
          style={{
            display: 'flex', gap: 16,
            animation: 'marquee 36s linear infinite',
            width: 'max-content',
          }}
        >
          {doubled.map((proj, i) => (
            <div
              key={i}
              style={{
                width: 220, height: 300,
                borderRadius: 16, overflow: 'hidden',
                flexShrink: 0, position: 'relative', cursor: 'pointer',
                backgroundImage: `url(${proj.img})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.72) 100%)',
              }} />

              {/* Top meta */}
              <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(6px)', padding: '3px 8px', borderRadius: 4 }}>
                  {proj.tag}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{proj.year}</span>
              </div>

              {/* Bottom info */}
              <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
                  {proj.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em', lineHeight: 1.4 }}>
                  {proj.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Bridge ───────────────────────────────────────────────────────────────────
function BridgeSection() {
  const { ref, visible } = useReveal(0.18)
  return (
    <section style={{ background: '#fff', padding: '108px 64px 120px', borderTop: '1px solid #e8e8e8' }}>
      <div ref={ref}>
        <h2 style={{ fontSize: 'clamp(60px, 10.5vw, 156px)', fontWeight: 900, lineHeight: 0.87, letterSpacing: '-0.035em', textTransform: 'uppercase', color: '#0a0a0a', margin: 0 }}>
          <CharReveal lines={['아이디어에서', '실행으로']} visible={visible} stagger={24} />
        </h2>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, opacity: visible ? 1 : 0, transition: 'opacity 0.95s ease 0.5s' }}>
          <span style={{ fontSize: 52, color: '#0a0a0a', lineHeight: 1 }}>↓</span>
        </div>
      </div>
    </section>
  )
}

// ─── About / Team (04) ───────────────────────────────────────────────────────
function TeamSection() {
  return (
    <section id="team" style={{ background: '#fff', padding: '120px 64px 120px', borderTop: '1px solid #e8e8e8' }}>
      <Reveal>
        <h2 style={{ fontSize: 'clamp(36px, 5.8vw, 82px)', fontWeight: 900, lineHeight: 0.87, letterSpacing: '-0.03em', textTransform: 'uppercase', color: '#0a0a0a', margin: '0 0 88px' }}>
          우리는 일상의 문제를<br />코드로 해결합니다.
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <div style={{ display: 'flex', gap: 80, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 340, height: 420, flexShrink: 0, overflow: 'hidden', background: '#f0f0ee' }}>
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=680&h=840&fit=crop&auto=format&q=80"
              alt="team"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', display: 'block', marginBottom: 36 }}>
              04 — 팀 소개
            </span>
            <p style={{ fontSize: 17, lineHeight: 1.72, color: '#333', margin: '0 0 20px', fontWeight: 400 }}>
              SW학부 해커톤 2026에 출전하는 <strong style={{ color: '#0a0a0a' }}>연리(連理)</strong> 팀입니다.
              "나무 두 그루의 가지가 맞닿아 하나가 된다"는 뜻으로,
              소상공인과 주민 사이의 간극을 연결한다는 의미를 담았습니다.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.72, color: '#333', margin: '0 0 48px', fontWeight: 400 }}>
              3일 안에 실제 동작하는 MVP를 제출하기 위해
              Flutter · FastAPI · Supabase 스택을 선택했습니다.
              빠른 프로토타이핑과 완성도 높은 UI를 동시에 달성하는 것이 목표입니다.
            </p>
            <div style={{ borderTop: '1px solid #e8e8e8' }}>
              {[
                { name: '최다울', role: '팀장', task: 'Flutter · 기획 · UI/UX', emoji: '🧑‍💻' },
                { name: '엄태훈', role: '팀원', task: '백엔드 · DB · API 설계', emoji: '⚙️' },
                { name: '이동교', role: '팀원', task: 'UI/UX · 디자인 · 발표', emoji: '🎨' },
              ].map(m => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 0', borderBottom: '1px solid #e8e8e8' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{m.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0a0a0a', flex: '0 0 60px' }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: '#bbb', letterSpacing: '0.06em', flex: '0 0 44px' }}>{m.role}</span>
                  <span style={{ fontSize: 13, color: '#666' }}>{m.task}</span>
                </div>
              ))}
            </div>
            <a href="#cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#0a0a0a', textDecoration: 'underline', textUnderlineOffset: 5, marginTop: 36 }}>
              함께 만들어봐요 →
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTASection() {
  const { ref, visible } = useReveal(0.12)
  return (
    <section id="cta" style={{ background: '#fff', borderTop: '1px solid #e8e8e8', padding: '108px 64px 120px' }}>
      <div ref={ref} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 48 }}>
        <h2 style={{ fontSize: 'clamp(52px, 9vw, 132px)', fontWeight: 900, lineHeight: 0.87, letterSpacing: '-0.035em', textTransform: 'uppercase', color: '#0a0a0a', margin: 0 }}>
          <CharReveal lines={['함께', '만들어봐요.']} visible={visible} stagger={32} />
        </h2>
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transition: 'opacity 0.9s ease 0.35s, transform 0.9s ease 0.35s', maxWidth: 320 }}>
          <p style={{ fontSize: 16, color: '#555', lineHeight: 1.65, margin: '0 0 32px' }}>
            긴박감 기반 UX로 동네 소상공인과 주민을 연결하는 하이퍼로컬 플래시 세일 플랫폼입니다.
            SW학부 해커톤 2026에서 만나보세요.
          </p>
          <a
            href="https://github.com/daoulee/FabSentinel"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, color: '#0a0a0a', textDecoration: 'underline', textUnderlineOffset: 5 }}
          >
            GitHub 보기 →
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const { ref, visible } = useReveal(0.05)
  return (
    <footer style={{ background: '#0a0a0a', color: '#fff', padding: '88px 64px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 48, paddingBottom: 72, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Reveal style={{ maxWidth: 380 }}>
          <p style={{ fontSize: 19, lineHeight: 1.62, color: 'rgba(255,255,255,0.65)', margin: '0 0 36px', fontWeight: 400 }}>
            우리 동네 타임딜®은 동네 소상공인의 재고 손실을 줄이고
            주민에게 실시간 핫딜을 전달하는 하이퍼로컬 플랫폼입니다.
          </p>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 10px' }}>CONTACT US</p>
            <a href="mailto:choidaoul@gmail.com" style={{ fontSize: 18, color: '#fff', textDecoration: 'underline', textUnderlineOffset: 5 }}>choidaoul@gmail.com</a>
          </div>
        </Reveal>
        <div style={{ display: 'flex', gap: 72 }}>
          <Reveal>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 22px' }}>팀 — 연리</p>
              {['최다울', '엄태훈', '이동교'].map(n => (
                <p key={n} style={{ fontSize: 18, margin: '0 0 12px', color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>{n}</p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={60}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 22px' }}>NAVIGATION</p>
              {[['홈', '#'], ['서비스', '#meet'], ['기능', '#features'], ['기술', '#tech'], ['팀', '#team']].map(([n, h]) => (
                <p key={n} style={{ fontSize: 18, margin: '0 0 12px', fontWeight: 400 }}>
                  <a href={h} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{n}</a>
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
      <div ref={ref} style={{ fontSize: 'clamp(80px, 15vw, 220px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.82, textTransform: 'uppercase', color: '#fff', marginTop: 52, whiteSpace: 'nowrap', userSelect: 'none' }}>
        <CharReveal lines={['타임딜®']} visible={visible} stagger={55} baseDelay={100} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0 26px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 14 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0, letterSpacing: '0.04em' }}>SW학부 해커톤 2026 &nbsp;·&nbsp; 연리(連理) 팀</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>© 2026</p>
      </div>
    </footer>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  useLenis()
  return (
    <div>
      <Navbar />
      <HeroSection />
      <MeetSection />
      <FeaturesSection />
      <LiveDemoSection />
      <ArchSection />
      <TechSection />
      <BridgeSection />
      <TeamSection />
      <CTASection />
      <Footer />
    </div>
  )
}
