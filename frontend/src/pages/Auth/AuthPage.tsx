/**
 * 로그인·회원가입·Supabase 이메일 인증·비밀번호 찾기를 제공하는 인증 화면입니다.
 * 백엔드 Auth 모듈과 authClient/apiFetch를 통해 계정 세션을 처리합니다.
 * 서비스 역할 키를 사용하지 않고 브라우저에는 access token만 저장합니다.
 */
import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, Store, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authClient, setAuthToken } from "@/lib/auth";
import { apiFetch, applySellerAccount, sendEmailOtp as requestEmailOtp, updateMyProfile } from "@/lib/api";
import { isSupabaseAuthConfigured, startKakaoAuth, startNaverAuth } from "@/lib/supabase-auth";
import { normalizeApiError, readResponseBody } from "@/lib/api-error";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { StatusBadge } from "@/shared/components/StatusBadge";

type Mode = "signin" | "signup" | "forgot" | "otp";

export default function AuthPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(initialMode === "signup" || initialMode === "otp" || initialMode === "forgot" ? initialMode : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreements, setAgreements] = useState({ age: true, terms: true, privacy: true, marketing: false });
  const [wantsSeller, setWantsSeller] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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

  async function onOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (!otpSent) {
        const response = await requestEmailOtp(otpEmail, `${window.location.origin}/auth`);
        if (!response.ok) throw new Error(normalizeApiError(await readResponseBody(response)).message);
        setOtpSent(true);
        toast.success("인증 코드를 이메일로 보냈습니다.");
      } else {
        const response = await apiFetch("/auth/email-otp/verify", {
          method: "POST",
          auth: false,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: otpEmail, token: otpCode, type: "email" }),
        });
        const body = await readResponseBody(response) as { data?: { accessToken?: string | null } } | null;
        if (!response.ok) throw new Error(normalizeApiError(body).message);
        if (body?.data?.accessToken) setAuthToken(body.data.accessToken);
        toast.success("이메일 인증과 로그인을 완료했습니다.");
        navigate("/", { replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이메일 인증에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "forgot") { setSubmitting(true); try { const response = await apiFetch("/auth/forgot-password", { method: "POST", auth: false, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); if (!response.ok) throw new Error(normalizeApiError(await readResponseBody(response)).message); toast.success("비밀번호 초기화 메일을 보냈습니다."); setMode("signin"); } catch (error) { toast.error(error instanceof Error ? error.message : "초기화 요청에 실패했습니다."); } finally { setSubmitting(false); } return; }
    if (mode === "signup" && !(agreements.age && agreements.terms && agreements.privacy)) { toast.error("필수 약관에 모두 동의해야 가입할 수 있습니다."); return; }
    setSubmitting(true);
    try {
      const result = mode === "signup" ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message ?? "인증에 실패했습니다.");
      if (mode === "signup") {
        if (!result.data?.token) { toast.success(wantsSeller ? "인증 메일을 확인한 뒤 로그인하고, 마이페이지에서 판매자 신청을 완료해 주세요." : "인증 메일을 확인한 뒤 로그인해 주세요."); setMode("signin"); return; }
        if (agreements.marketing) void updateMyProfile({ marketingOptIn: true }).catch(() => {});
        if (wantsSeller) {
          const applyResult = await applySellerAccount({ businessName, businessNumber });
          if (!applyResult.ok) toast.error(applyResult.error?.message ?? "회원가입은 완료됐지만 판매자 신청은 접수하지 못했습니다. 마이페이지에서 다시 시도해 주세요.");
          else toast.success("회원가입과 판매자 신청을 완료했습니다. 관리자 승인 후 판매자 센터를 이용할 수 있습니다.");
        } else toast.success("회원가입과 로그인을 완료했습니다.");
        navigate("/", { replace: true }); return;
      }
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

  return (
    <div className="auth-page" data-theme-state={theme}>
      <aside className="auth-visual">
        <Link to="/" className="auth-back"><ArrowLeft size={17} /> 홈으로</Link>
        <div><p>TIMEDEAL ACCOUNT</p><h1>함께 사는 경험을<br />계정 하나로 이어가세요.</h1><span>참여 딜, 리뷰, 문의, 주문 내역을 안전한 세션으로 관리합니다.</span></div>
        <ul><li><CheckCircle2 /> 안전한 로그인 세션 유지</li><li><CheckCircle2 /> 이메일 인증으로 안전하게 가입</li><li><CheckCircle2 /> 자동 로그인 상태 유지</li></ul>
      </aside>
      <main className="auth-panel">
        <div className="auth-card">
          <Link to="/" className="brand auth-brand" aria-label="타임딜 홈"><img src="/images/deal-logo.png" alt="" className="brand-logo" /></Link>
          {verificationEmail ? (
            <><div className="auth-heading"><StatusBadge type="live">이메일 인증</StatusBadge><h2>인증 코드를 입력해 주세요.</h2><p>{verificationEmail}로 보낸 6자리 코드입니다.</p></div><form onSubmit={onVerify}><label><span>인증 코드</span><div className="input-wrap"><Mail /><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div></label><button className="primary-button full" disabled={submitting || verificationCode.length !== 6}>{submitting ? "확인 중..." : "이메일 인증 완료"}</button><button className="text-button" type="button" disabled={submitting || resendWaitSeconds > 0} onClick={() => void sendVerificationCode().then(() => toast.success("인증 코드를 다시 보냈습니다.")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "재전송 실패"))}>{resendWaitSeconds > 0 ? `${resendWaitSeconds}초 후 재전송` : "인증 코드 다시 받기"}</button></form></>
          ) : (
            <>
              <div className="auth-tabs">{(["signin", "signup"] as Mode[]).map((item) => <button key={item} type="button" className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "signin" ? "로그인" : "회원가입"}</button>)}</div>
              <div className="auth-heading"><h2>{mode === "signup" ? "타임딜에 가입하기" : mode === "forgot" ? "비밀번호 찾기" : mode === "otp" ? "이메일로 간편 로그인" : "다시 오신 걸 환영해요."}</h2><p>{mode === "forgot" ? "가입 이메일로 안전한 비밀번호 재설정 링크를 보냅니다." : "계정으로 참여 딜과 나의 활동을 관리하세요."}</p></div>
              {mode === "otp" ? (
                <form onSubmit={onOtpSubmit}><label><span>이메일</span><div className="input-wrap"><Mail /><input type="email" value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} placeholder="name@example.com" required /></div></label>{otpSent && <label><span>6자리 인증 코드</span><div className="input-wrap"><KeyRound /><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div></label>}<button className="primary-button full" disabled={submitting || (otpSent && otpCode.length !== 6)}>{submitting ? "처리 중..." : otpSent ? "인증하고 로그인" : "인증 코드 받기"}</button></form>
              ) : (
                <><form onSubmit={onSubmit}>{mode === "signup" && <div className="role-toggle" role="group" aria-label="회원 유형"><button type="button" className={!wantsSeller ? "active" : ""} onClick={() => setWantsSeller(false)}><UserRound size={15} /> 일반</button><button type="button" className={wantsSeller ? "active" : ""} onClick={() => setWantsSeller(true)}><Store size={15} /> 판매자</button></div>}{mode === "signup" && <label><span>이름</span><div className="input-wrap"><UserRound /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="이름" required /></div></label>}<label><span>이메일</span><div className="input-wrap"><Mail /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></div></label>{mode !== "forgot" && <label><span>비밀번호</span><div className="input-wrap"><KeyRound /><input type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" required /></div></label>}
                {mode === "signup" && wantsSeller && <><label><span>사업자명</span><div className="input-wrap"><Store /><input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="사업자명" required /></div></label><label><span>사업자등록번호</span><div className="input-wrap"><Store /><input value={businessNumber} onChange={(event) => setBusinessNumber(event.target.value)} placeholder="000-00-00000" required /></div></label><p className="integration-note">판매자 가입은 제출 후 관리자 승인이 필요합니다.</p></>}
                {mode === "signup" && <div className="terms-group"><label className="check-label"><input type="checkbox" checked={agreements.age} onChange={(event) => setAgreements({ ...agreements, age: event.target.checked })} required /> (필수) 만 14세 이상입니다</label><label className="check-label"><input type="checkbox" checked={agreements.terms} onChange={(event) => setAgreements({ ...agreements, terms: event.target.checked })} required /> (필수) 이용약관에 동의합니다</label><label className="check-label"><input type="checkbox" checked={agreements.privacy} onChange={(event) => setAgreements({ ...agreements, privacy: event.target.checked })} required /> (필수) 개인정보 수집 및 이용에 동의합니다</label><label className="check-label"><input type="checkbox" checked={agreements.marketing} onChange={(event) => setAgreements({ ...agreements, marketing: event.target.checked })} /> (선택) 이벤트·혜택 정보 수신에 동의합니다</label></div>}
                <button className="primary-button full" disabled={submitting || (mode === "signup" && !(agreements.age && agreements.terms && agreements.privacy))}>{submitting ? "처리 중..." : mode === "signup" ? "회원가입" : mode === "forgot" ? "재설정 메일 받기" : "로그인"}</button></form><button className="text-button" type="button" onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}>{mode === "forgot" ? "로그인으로 돌아가기" : "비밀번호를 잊으셨나요?"}</button></>
              )}
              <div className="auth-social-actions"><button className="secondary-button full kakao-button" type="button" disabled={!isSupabaseAuthConfigured} onClick={() => void startKakaoAuth(`${window.location.origin}/auth`).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "카카오 로그인에 실패했습니다."))}>카카오로 로그인{!isSupabaseAuthConfigured ? " · 설정 필요" : ""}</button><button className="secondary-button full naver-button" type="button" disabled={!isSupabaseAuthConfigured} onClick={() => void startNaverAuth(`${window.location.origin}/auth`).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "네이버 로그인에 실패했습니다."))}>네이버로 로그인{!isSupabaseAuthConfigured ? " · 설정 필요" : ""}</button>{mode !== "otp" && <button className="text-button" type="button" onClick={() => { setMode("otp"); setOtpSent(false); setOtpCode(""); }}>이메일 인증번호로 로그인</button>}</div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
