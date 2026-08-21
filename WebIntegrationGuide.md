# 웹팀 Supabase 연동 가이드

> Flutter 앱(`app/`)과 같은 Supabase 프로젝트를 웹(`presentation/` 또는 별도 웹 프로젝트)에서 그대로 읽어서, **같은 동네에 올라온 딜을 웹에서도 보여주는 것**이 목표입니다.

---

## 1. 접속 정보

```
Project URL : https://gnrnsbuqmofcjoamjsqk.supabase.co
Anon Key    : sb_publishable_s6iikkgXxBka9Uo9R0fN7A_qgQqG_YI
```

이 키는 브라우저에 노출돼도 되는 **공개용(anon/publishable) 키**입니다. DB 접근 범위는 서버의 RLS(Row Level Security) 정책이 결정합니다 — 아래 [6. 보안](#6-보안--rls) 참고.

⚠️ **`service_role` 키는 별도로 존재하며, 절대 웹/클라이언트 코드에 넣으면 안 됩니다.** 그 키는 RLS를 통째로 우회합니다. 이 문서엔 애초에 적어두지 않았고, 필요할 일도 없습니다.

---

## 2. 설치 & 초기화

```bash
npm install @supabase/supabase-js
```

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://gnrnsbuqmofcjoamjsqk.supabase.co',
  'sb_publishable_s6iikkgXxBka9Uo9R0fN7A_qgQqG_YI'
)
```

키를 코드에 직접 박기보다는 `.env`로 빼서 관리하는 걸 권장합니다 (`.gitignore` 처리 필수 — 이 프로젝트도 예전에 키가 GitHub에 그대로 올라간 적 있어서 재발급했던 이력이 있어요).

```env
# .env.local
VITE_SUPABASE_URL=https://gnrnsbuqmofcjoamjsqk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_s6iikkgXxBka9Uo9R0fN7A_qgQqG_YI
```

---

## 3. `deals` 테이블 스키마

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK, 자동 생성 |
| `store_id` | text | 사장님 식별자 (Supabase Auth user.id) |
| `store_name` | text | 가게 이름 |
| `store_category` | text | 베이커리/음식/카페/마트/꽃집 |
| `title` | text | 딜 제목 |
| `description` | text | 딜 설명 |
| `original_price` | integer | 정가 |
| `discounted_price` | integer | 할인가 |
| `total_stock` | integer | 총 수량 |
| `remaining_stock` | integer | 남은 수량 |
| `expires_at` | timestamptz | 마감 시각 (UTC) |
| `image_url` | text | 딜 이미지 URL |
| `icon_name` | text | 카테고리 아이콘 키 |
| `created_at` | timestamptz | 등록 시각 |
| **`store_lat`** | double precision | 가게 실제 위도 (nullable) |
| **`store_lng`** | double precision | 가게 실제 경도 (nullable) |
| **`neighborhood`** | text | 가게 동 이름, 예: `"비산동"` (nullable) |

`store_lat`/`store_lng`/`neighborhood`는 2026-08-21에 추가된 컬럼입니다. 이전에 등록된 일부 딜(데모용 시드 데이터)은 이 값이 `null`일 수 있어요 — 웹에서 필터링할 때 null 케이스도 고려해주세요.

---

## 4. 같은 동네 딜 조회

### 방법 A — 동 이름 정확히 일치 (가장 간단, 추천)

```ts
const { data: deals, error } = await supabase
  .from('deals')
  .select('*')
  .eq('neighborhood', '비산동')       // 웹 방문자가 선택/입력한 동네
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })
```

### 방법 B — 반경 기준 (예: 3km 이내)

동 이름 대신 실제 거리로 필터링하고 싶으면, 웹 방문자의 GPS(`userLat`, `userLng`)와 `store_lat`/`store_lng`로 haversine 거리를 계산합니다. 앱(Flutter)도 `GeoUtils.haversine()`에서 같은 공식을 씁니다:

```ts
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const { data: allDeals } = await supabase
  .from('deals')
  .select('*')
  .gt('expires_at', new Date().toISOString())
  .not('store_lat', 'is', null)

const nearby = allDeals!.filter(
  (d) => haversineKm(userLat, userLng, d.store_lat, d.store_lng) <= 3
)
```

(DB 레벨에서 반경 검색을 하고 싶으면 PostGIS 확장이 필요한데, 해커톤 범위에선 방법 A나 클라이언트 필터링이면 충분합니다.)

---

## 5. 실시간 반영 (선택)

새 딜이 올라오는 즉시 웹에도 반영하고 싶으면 Realtime을 구독하세요. 앱도 동일한 방식(`deals-changes` 채널)으로 동작합니다:

```ts
supabase
  .channel('deals-changes-web')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'deals' },
    (payload) => {
      // payload.eventType: INSERT | UPDATE | DELETE
      // 새로 목록을 다시 불러오거나, payload.new로 직접 갱신
    }
  )
  .subscribe()
```

---

## 6. 보안 — RLS

`deals` 테이블은 Row Level Security로 보호되어 있습니다. anon key로 가능한 것/불가능한 것:

| 동작 | 가능 여부 |
|---|---|
| 조회 (SELECT) | ✅ 전체 공개 |
| 등록 (INSERT) | ✅ `store_id`만 있으면 가능 (사장님 앱 전용 — 웹은 조회만 하면 됨) |
| 수정 (UPDATE) | ⚠️ 마감 전(`expires_at > now()`) 딜만 가능 |
| 삭제 (DELETE) | ❌ 항상 차단 |

웹은 **조회 전용**으로만 쓰면 되니 별도 인증 없이 anon key만으로 충분합니다. 예약/구매까지 웹에서 처리하고 싶다면 그건 범위가 커지는 별도 작업이라(재고 동시성 처리용 RPC 등) 필요해지면 먼저 얘기해주세요.

---

## 7. 문의

연동하다 막히는 거 있으면 레포 루트의 [`Communicate.md`](./Communicate.md)에 남겨주세요 — Claude/Kiro/Antigravity가 확인하고 답 남깁니다. 급하면 팀장(최다울)한테 바로 연락 주세요.

---

> Last edited by: Claude (2026-08-21)
