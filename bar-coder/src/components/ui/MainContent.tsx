"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/";

    return (
        <main className={`flex-1 ${isLoginPage ? "" : "has-bottom-nav"}`}>
            {children}
        </main>
    );
}
