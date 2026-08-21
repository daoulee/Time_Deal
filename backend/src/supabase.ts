/**
 * 기능 모듈이 사용하는 Supabase anon·service role 클라이언트를 서버에서 생성합니다.
 * Auth는 anon 인증을 사용하고 보호된 데이터 작업은 admin client를 사용합니다.
 * service role key는 프론트로 전달하지 않으며 미설정 시 명시적으로 실패합니다.
 */
import { createClient } from "@supabase/supabase-js"; import { config, isMobileSupabaseConfigured, isSupabaseConfigured } from "./config.js";
const options={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
export const getAnonSupabase=()=>{if(!isSupabaseConfigured()) throw new Error("SUPABASE_UNCONFIGURED"); return createClient(config.supabaseUrl,config.supabaseAnonKey,options)};
export const getAdminSupabase=()=>{if(!isSupabaseConfigured()) throw new Error("SUPABASE_UNCONFIGURED"); return createClient(config.supabaseUrl,config.supabaseServiceRoleKey,options)};
// 모바일 팀 Supabase 프로젝트(별도 프로젝트, anon key만 공개 제공됨)용 클라이언트입니다.
// accessToken을 넘기면 그 모바일 계정으로 인증된 상태로 요청하므로 reservations/wishlists에 남는 user_id가 실제 모바일 앱 계정과 일치합니다.
export const getMobileSupabase=(accessToken?:string)=>{if(!isMobileSupabaseConfigured()) throw new Error("MOBILE_SUPABASE_UNCONFIGURED"); return createClient(config.mobileSupabaseUrl,config.mobileSupabaseAnonKey,accessToken?{...options,global:{headers:{Authorization:`Bearer ${accessToken}`}}}:options)};
