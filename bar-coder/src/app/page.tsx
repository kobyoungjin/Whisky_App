"use client";

import React, { useState } from "react";
import LoadingButton from "@/components/ui/LoadingButton";
import { loginWithGoogle, loginWithEmail, signUpWithEmail, loginAnonymously } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      alert("로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        alert("회원가입이 완료되었습니다.");
      } else {
        await loginWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Auth Error:", error);
      alert(error.message || "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await loginAnonymously();
      router.push("/dashboard");
    } catch (error) {
      console.error("Anonymous login failed:", error);
      alert("익명 로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-full w-full flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: "calc(100dvh - 5rem)" }}>
      {/* Hero Background Wrapper */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Luxury cocktail bar background"
          className="w-full h-full object-cover opacity-60"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6xxOmeobu81tD82xH_3kF_ww72fbgQb-YOUbjYkYl7DvELr3OIlE0_Jg3daGKCrUy31YEwVIb5TbCVYtD18SoMKRZ_-Jr4w3cCtkWNxIIXh_Jj_fbFbEBLodUeioGCG7smyRPiacGr4Bz4pEmwTNExwliyIjUxfsnuw0KyAelSW-uxqozoZrEe945mSFt37ptpOd_3L9zsUcg15-UNbSaACkWtGmLdSggg1YOxSmhbb6HxpCyPMwc9J8luMv6RuQK_vsYzF25Ari8"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40"></div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex flex-col items-center justify-center w-full px-6 py-20 animate-fade-in-up">
        {/* Brand Identity Section */}
        <header className="text-center mb-16">
          <h1 className="font-headline italic text-primary text-5xl md:text-6xl tracking-tight mb-2">
            Bar Coder
          </h1>
          <p className="font-label text-on-surface-variant text-xs uppercase tracking-[0.2em]">
            Curated Spirits & Bespoke Recipes
          </p>
        </header>

        {/* Login Container */}
        <section className="w-full max-w-md bg-surface-container-low/40 backdrop-blur-xl p-8 md:p-12 rounded-xl shadow-2xl border border-outline-variant/10">
          <div className="mb-10">
            <h2 className="font-headline text-2xl text-on-surface mb-2">
              {isSignUp ? "반갑습니다" : "환영합니다"}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {isSignUp ? "초대를 위한 정보를 입력해 주세요" : "로그인하여 프라이빗 바에 입장하세요"}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-8">
            {/* Input Fields */}
            <div className="space-y-6">
              <div className="group">
                <label
                  className="block font-label text-xs text-on-surface-variant uppercase tracking-wider mb-2 transition-colors group-focus-within:text-primary"
                  htmlFor="email"
                >
                  이메일 주소
                </label>
                <div className="input-gradient-border">
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-none p-0 pb-3 focus:ring-0 text-on-surface placeholder:text-on-surface-variant/30 font-body text-base outline-none"
                  />
                </div>
              </div>
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label
                    className="block font-label text-xs text-on-surface-variant uppercase tracking-wider transition-colors group-focus-within:text-primary"
                    htmlFor="password"
                  >
                    비밀번호
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-[10px] text-primary/60 hover:text-primary uppercase tracking-widest transition-colors"
                    >
                      비밀번호 찾기
                    </button>
                  )}
                </div>
                <div className="input-gradient-border">
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-none p-0 pb-3 focus:ring-0 text-on-surface placeholder:text-on-surface-variant/30 font-body text-base outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Primary Action */}
            <LoadingButton
              loading={loading}
              type="submit"
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold uppercase tracking-widest rounded-lg transition-all duration-400 active:scale-[0.98] shadow-lg shadow-primary/10 hover:shadow-primary/20"
            >
              {isSignUp ? "멤버십 신청하기" : "로그인하기"}
            </LoadingButton>
          </form>

          {/* Divider */}
          <div className="flex items-center my-10 space-x-4">
            <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-[0.3em]">
              또는 다음으로 연결
            </span>
            <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center space-x-3 py-3 px-4 border border-outline-variant/30 rounded-lg bg-surface-container-high/40 hover:bg-surface-container-high transition-colors group disabled:opacity-50"
            >
              <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="currentColor"
                ></path>
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="currentColor"
                ></path>
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="currentColor"
                ></path>
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="currentColor"
                ></path>
              </svg>
              <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors">
                Google
              </span>
            </button>
            <button
              onClick={handleAnonymousLogin}
              disabled={loading}
              className="flex items-center justify-center space-x-3 py-3 px-4 border border-outline-variant/30 rounded-lg bg-surface-container-high/40 hover:bg-surface-container-high transition-colors group disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface transition-colors text-lg">
                person_outline
              </span>
              <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors">
                익명 로그인
              </span>
            </button>
          </div>

          {/* Footer Link */}
          <div className="mt-12 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-on-surface-variant text-sm hover:text-primary transition-colors"
            >
              {isSignUp ? "이미 회원이신가요? " : "처음이신가요? "}
              <span className="text-primary font-medium hover:underline ml-1 underline-offset-4">
                {isSignUp ? "로그인하기" : "회원가입하기"}
              </span>
            </button>
          </div>
        </section>

        {/* Signature Editorial Element */}
        <div className="mt-16 text-center max-w-xs opacity-60">
          <span className="material-symbols-outlined text-primary mb-4 block" style={{ fontVariationSettings: "'FILL' 0" }}>
            auto_stories
          </span>
          <p className="font-headline italic text-sm text-on-surface">
            "칵테일의 예술은 술과 잔 사이의 대화입니다."
          </p>
        </div>
      </main>
    </div>
  );
}
