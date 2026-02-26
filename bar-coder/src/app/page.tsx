"use client";

import React, { useState } from "react";
import LoadingButton from "@/components/ui/LoadingButton";
import { loginWithGoogle, loginWithEmail, signUpWithEmail } from "@/lib/firebase";
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[#1a1a1a]">
      <div className="w-full max-w-sm text-center animate-fade-in-up">
        {/* Logo or App Name */}
        <div className="mb-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-[#d4a843] opacity-20 blur-2xl rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center w-full h-full border-2 border-[#d4a843]/30 rounded-full">
              <span className="text-4xl">🥃</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold gold-text mb-3 tracking-tight">Bar Coder</h1>
          <p className="text-[#a8a49d] text-sm leading-relaxed">
            나만의 홈바를 위한<br />똑똑한 칵테일 관리 솔루션
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 flex flex-col items-center">
          <form onSubmit={handleEmailAuth} className="w-full mb-6">
            <div className="space-y-4 mb-6">
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#333] border border-[#d4a843]/20 rounded-xl text-[#f0ede8] placeholder-[#a8a49d] focus:outline-none focus:border-[#d4a843]"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#333] border border-[#d4a843]/20 rounded-xl text-[#f0ede8] placeholder-[#a8a49d] focus:outline-none focus:border-[#d4a843]"
              />
            </div>
            <LoadingButton loading={loading} type="submit" className="w-full">
              {isSignUp ? "회원가입" : "이메일로 계속하기"}
            </LoadingButton>
          </form>

          <div className="flex items-center w-full mb-6 relative">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="px-3 text-xs text-[#6b6761] bg-transparent z-10">OR</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 flex items-center justify-center gap-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google 계정으로 시작하기
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-6 text-xs text-[#a8a49d] hover:text-[#d4a843] transition-colors"
          >
            {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
          </button>
        </div>
      </div>
    </div>
  );
}
