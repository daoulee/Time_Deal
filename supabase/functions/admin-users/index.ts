// 계정(Auth) 관리용 Edge Function.
//
// service_role 키는 이 함수 런타임에만 존재합니다(Supabase가 자동 주입하는
// SUPABASE_SERVICE_ROLE_KEY 환경변수). 웹/앱 클라이언트는 이 함수를
// 자기 로그인 세션(Authorization: Bearer <user access_token>)으로 호출할 뿐,
// service_role 자체를 절대 받지 않습니다.
//
// 관리자 판별: ADMIN_EMAILS 시크릿(콤마 구분 이메일 목록)에 있는 사용자만 허용.
//   npx supabase secrets set ADMIN_EMAILS="a@example.com,b@example.com"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 클라이언트에 돌려줄 필드만 최소로 추림 (내부 메타데이터 등 과다 노출 방지)
function shrink(u: {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    banned_until: u.banned_until ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. 호출자 신원 확인 — 호출자 본인의 access_token을 service_role로 검증
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing Authorization header" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return json({ error: "invalid session" }, 401);

    // 2. 관리자 여부 확인
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return json({ error: "forbidden: admin only" }, 403);
    }

    // 3. 요청된 관리 작업 수행 (service_role은 여기서만 쓰임)
    const { action, ...params } = await req.json();

    switch (action) {
      case "list": {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page: params.page ?? 1,
          perPage: params.perPage ?? 50,
        });
        if (error) throw error;
        return json({ users: data.users.map(shrink) });
      }

      case "get": {
        if (!params.userId) return json({ error: "userId required" }, 400);
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(params.userId);
        if (error) throw error;
        return json({ user: shrink(data.user) });
      }

      case "ban": {
        if (!params.userId) return json({ error: "userId required" }, 400);
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(params.userId, {
          ban_duration: params.duration ?? "876000h", // 사실상 영구 정지
        });
        if (error) throw error;
        return json({ user: shrink(data.user) });
      }

      case "unban": {
        if (!params.userId) return json({ error: "userId required" }, 400);
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(params.userId, {
          ban_duration: "none",
        });
        if (error) throw error;
        return json({ user: shrink(data.user) });
      }

      case "delete": {
        if (!params.userId) return json({ error: "userId required" }, 400);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(params.userId);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: `unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
