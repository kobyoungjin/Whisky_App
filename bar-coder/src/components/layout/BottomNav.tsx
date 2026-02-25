"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Beer, User } from "lucide-react";

const navItems = [
    { id: "home", label: "홈", icon: Home, href: "/dashboard" },
    { id: "scan", label: "스캔", icon: Search, href: "/scan" },
    { id: "recipes", label: "레시피", icon: Beer, href: "/recipes" },
    { id: "mypage", label: "마이", icon: User, href: "/mypage" },
];

const BottomNav: React.FC = () => {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 py-3 bg-[#1a1a1a]/80 backdrop-blur-xl border-t border-[#d4a843]/20 pb-[calc(12px+env(safe-area-inset-bottom))]">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div
                            className={`p-1.5 rounded-xl transition-all duration-300 ${isActive
                                    ? "bg-[#d4a843]/10 text-[#d4a843] shadow-[0_0_20px_rgba(212,168,67,0.15)]"
                                    : "text-[#a8a49d] group-hover:text-[#d4a843]/70"
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? "animate-fade-in-up" : ""}`} />
                        </div>
                        <span
                            className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-[#d4a843]" : "text-[#6b6761]"
                                }`}
                        >
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default BottomNav;
