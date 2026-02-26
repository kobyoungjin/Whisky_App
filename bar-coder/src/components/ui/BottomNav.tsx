"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, Wine, User } from "lucide-react";

export default function BottomNav() {
    const pathname = usePathname();

    // 로그인되지 않은 메인 화면에서는 네비게이션을 숨깁니다.
    if (pathname === "/") return null;

    const navItems = [
        { label: "홈", path: "/dashboard", icon: Home },
        { label: "레시피", path: "/recipes", icon: Wine },
        { label: "마이", path: "/mypage", icon: User },
    ];

    return (
        <nav className="fixed bottom-0 w-full bg-[#1a1a1a]/90 backdrop-blur-md border-t border-white/10 pb-safe z-50">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto px-6">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? "text-[#d4a843]" : "text-[#6b6761] hover:text-[#a8a49d]"
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? "drop-shadow-[0_0_8px_rgba(212,168,67,0.5)]" : ""}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
