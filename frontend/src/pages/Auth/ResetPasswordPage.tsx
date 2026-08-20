/**
 * Supabase 복구 링크의 세션을 읽어 새 비밀번호를 설정하는 완료 화면입니다.
 * 복구 세션이 없거나 만료되면 재요청을 안내하며 service role key는 사용하지 않습니다.
 */
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabaseAuthClient } from "@/lib/supabase-auth";

export default function ResetPasswordPage() {
  const navigate = useNavigate(); const [ready, setReady] = useState(false); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!supabaseAuthClient) return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, "")); const accessToken = hash.get("access_token"); const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) void supabaseAuthClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => setReady(!error));
    else void supabaseAuthClient.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (password !== confirm) return toast.error("비밀번호 확인이 일치하지 않습니다."); if (!supabaseAuthClient) return toast.error("인증 환경변수를 설정하세요."); setSubmitting(true); const { error } = await supabaseAuthClient.auth.updateUser({ password }); if (error) toast.error(error.message); else { await supabaseAuthClient.auth.signOut({ scope: "global" }); toast.success("비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요."); navigate("/auth", { replace: true }); } setSubmitting(false); };
  return <main className="auth-page"><section className="auth-panel"><div className="auth-card"><Link to="/" className="brand auth-brand"><strong>타임딜</strong></Link><div className="auth-heading"><h1>새 비밀번호 설정</h1><p>{ready ? "8자 이상의 새 비밀번호를 입력해 주세요." : "복구 세션을 확인하고 있습니다. 오래 걸리면 메일에서 링크를 다시 열어 주세요."}</p></div><form onSubmit={submit}><label><span>새 비밀번호</span><input type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label><span>비밀번호 확인</span><input type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label><button className="primary-button full" disabled={!ready || submitting}>{submitting ? "변경 중..." : "비밀번호 변경"}</button></form>{!ready && <Link className="text-button" to="/auth">복구 메일 다시 요청하기</Link>}</div></section></main>;
}
