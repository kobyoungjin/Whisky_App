"use client";

import React, { useState, useEffect } from "react";
import LoadingButton from "@/components/ui/LoadingButton";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      alert("로그인에 실패했습니다. 설정을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[#1a1a1a]">
      <div className="w-full max-w-sm text-center animate-fade-in-up">
        {/* Logo or App Name */}
        <div className="mb-12">
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
          <LoadingButton
            onClick={handleGoogleLogin}
            loading={loading}
            className="w-full py-4 flex items-center justify-center gap-3"
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
          </LoadingButton>

          <p className="mt-6 text-[10px] text-[#6b6761] text-center font-medium">
            계속 진행함으로써 서비스 이용약관 및 <br />개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
