/**
 * 기능 모듈이 사용하는 Supabase anon·service role 클라이언트를 서버에서 생성합니다.
 * Auth는 anon 인증을 사용하고 보호된 데이터 작업은 admin client를 사용합니다.
 * service role key는 프론트로 전달하지 않으며 미설정 시 명시적으로 실패합니다.
 */
import { createClient } from "@supabase/supabase-js"; import { config, isSupabaseConfigured } from "./config.js";
const options={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
export const getAnonSupabase=()=>{if(!isSupabaseConfigured()) throw new Error("SUPABASE_UNCONFIGURED"); return createClient(config.supabaseUrl,config.supabaseAnonKey,options)};
export const getAdminSupabase=()=>{if(!isSupabaseConfigured()) throw new Error("SUPABASE_UNCONFIGURED"); return createClient(config.supabaseUrl,config.supabaseServiceRoleKey,options)};
