/**
 * 로그인·회원가입·Supabase 이메일 인증·비밀번호 찾기를 제공하는 인증 화면입니다.
 * 백엔드 Auth 모듈과 authClient/apiFetch를 통해 계정 세션을 처리합니다.
 * 서비스 역할 키를 사용하지 않고 브라우저에는 access token만 저장합니다.
 */
import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { normalizeApiError, readResponseBody } from "@/lib/api-error";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { StatusBadge } from "@/shared/components/StatusBadge";

type Mode = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerificationEmail] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const verificationEmail = pendingVerificationEmail || (!session?.user?.emailVerified ? session?.user?.email ?? "" : "");
  const resendWaitSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));

  useEffect(() => { setNow(Date.now()); }, []);
  useEffect(() => {
    if (!resendAvailableAt || resendAvailableAt <= now) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [now, resendAvailableAt]);

  if (isPending) return <div className="auth-loading"><span aria-label="세션 확인 중" /></div>;
  if (session?.user?.emailVerified && !verificationEmail) return <Navigate to="/" replace />;

  async function sendVerificationCode() {
    const response = await apiFetch("/email-verification/send-code", { method: "POST", auth: true });
    if (!response.ok) {
      const body = await readResponseBody(response);
      const retry = body && typeof body === "object" && "data" in body ? Number((body.data as { retryAfterSeconds?: unknown } | null)?.retryAfterSeconds ?? 0) : 0;
      if (retry > 0) { setNow(Date.now()); setResendAvailableAt(Date.now() + retry * 1000); }
      throw new Error(normalizeApiError(body).message);
    }
    setNow(Date.now()); setResendAvailableAt(Date.now() + 60_000);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "forgot") { setSubmitting(true); try { const response = await apiFetch("/auth/forgot-password", { method: "POST", auth: false, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, redirectTo: `${window.location.origin}/auth` }) }); if (!response.ok) throw new Error(normalizeApiError(await readResponseBody(response)).message); toast.success("비밀번호 초기화 메일을 보냈습니다."); setMode("signin"); } catch (error) { toast.error(error instanceof Error ? error.message : "초기화 요청에 실패했습니다."); } finally { setSubmitting(false); } return; }
    setSubmitting(true);
    try {
      const result = mode === "signup" ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message ?? "인증에 실패했습니다.");
      if (mode === "signup") { if (!result.data?.token) { toast.success("Supabase 인증 메일을 확인한 뒤 로그인해 주세요."); setMode("signin"); return; } toast.success("회원가입과 로그인을 완료했습니다."); navigate("/", { replace: true }); return; }
      toast.success("로그인했습니다."); navigate("/", { replace: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "인증에 실패했습니다."); }
    finally { setSubmitting(false); }
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true);
    try {
      const response = await apiFetch("/email-verification/verify-code", { method: "POST", auth: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: verificationCode }) });
      if (!response.ok) throw new Error(normalizeApiError(await readResponseBody(response)).message);
      toast.success("이메일 인증을 완료했습니다."); navigate("/", { replace: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "인증에 실패했습니다."); }
    finally { setSubmitting(false); }
  }

  return <div className="auth-page" data-theme-state={theme}>
    <aside className="auth-visual"><Link to="/" className="auth-back"><ArrowLeft size={17} /> 홈으로</Link><div><p>TIMEDEAL ACCOUNT</p><h1>함께 사는 경험을<br />계정 하나로 이어가세요.</h1><span>참여 딜, 리뷰, 문의, 주문 내역을 안전한 세션으로 관리합니다.</span></div><ul><li><CheckCircle2 /> Supabase Auth 세션 구조 적용</li><li><CheckCircle2 /> Supabase 인증 메일 연결</li><li><CheckCircle2 /> Bearer 토큰 저장 로직 재사용</li></ul></aside>
    <main className="auth-panel"><div className="auth-card"><Link to="/" className="brand auth-brand"><span className="brand-mark"><LockKeyhole size={18} /></span><strong>타임딜</strong></Link>{verificationEmail ? <><div className="auth-heading"><StatusBadge type="live">이메일 인증</StatusBadge><h2>인증 코드를 입력해 주세요.</h2><p>{verificationEmail}로 보낸 6자리 코드입니다.</p></div><form onSubmit={onVerify}><label><span>인증 코드</span><div className="input-wrap"><Mail /><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div></label><button className="primary-button full" disabled={submitting || verificationCode.length !== 6}>{submitting ? "확인 중..." : "이메일 인증 완료"}</button><button className="text-button" type="button" disabled={submitting || resendWaitSeconds > 0} onClick={() => void sendVerificationCode().then(() => toast.success("인증 코드를 다시 보냈습니다.")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "재전송 실패"))}>{resendWaitSeconds > 0 ? `${resendWaitSeconds}초 후 재전송` : "인증 코드 다시 받기"}</button></form></> : <><div className="auth-tabs">{(["signin", "signup"] as Mode[]).map((item) => <button key={item} type="button" className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "signin" ? "로그인" : "회원가입"}</button>)}</div><div className="auth-heading"><h2>{mode === "signup" ? "타임딜에 가입하기" : mode === "forgot" ? "비밀번호 찾기" : "다시 오신 걸 환영해요."}</h2><p>{mode === "forgot" ? "가입 이메일로 초기화 안내를 받을 수 있도록 준비 중입니다." : "계정으로 참여 딜과 나의 활동을 관리하세요."}</p></div><form onSubmit={onSubmit}>{mode === "signup" && <label><span>이름</span><div className="input-wrap"><UserRound /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="이름" required /></div></label>}<label><span>이메일</span><div className="input-wrap"><Mail /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></div></label>{mode !== "forgot" && <label><span>비밀번호</span><div className="input-wrap"><KeyRound /><input type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" required /></div></label>}<button className="primary-button full" disabled={submitting}>{submitting ? "처리 중..." : mode === "signup" ? "회원가입" : mode === "forgot" ? "초기화 안내 받기 · 준비 중" : "로그인"}</button></form><button className="text-button" type="button" onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}>{mode === "forgot" ? "로그인으로 돌아가기" : "비밀번호를 잊으셨나요?"}</button></>}</div></main>
  </div>;
}
