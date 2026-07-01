"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, User, Bot, ChevronRight, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { useRouter } from "next/navigation";

type PriceLink = { title: string; url: string; site: string };

type Message = {
    role: "user" | "assistant";
    content: string;
    // Optional recipe cards attached to an assistant reply.
    cards?: { name: string; detail: string }[];
    // Optional price / marketplace links.
    priceLinks?: PriceLink[];
};

const GREETING = "어서오세요! 홈바 바텐더 AI입니다. 안주나 칵테일 얘기, 홈바 관련 궁금한 점 뭐든 편하게 물어보세요.";

const SUGGESTIONS = [
    "육회에 어울리는 칵테일 추천해줘",
    "내가 가진 술로 만들 수 있는 칵테일은?",
    "네그로니에 어울리는 안주는?",
    "위스키 종류별 차이를 알려줘",
];

export default function ChatPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: GREETING },
    ]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [expandedCard, setExpandedCard] = useState<{ msgIdx: number; cardIdx: number } | null>(null);
    const scrollAnchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isSending]);

    useEffect(() => {
        if (!loading && !user) router.push("/");
    }, [user, loading, router]);

    const send = async (text: string) => {
        if (!text.trim() || !user || isSending) return;
        const userMsg: Message = { role: "user", content: text.trim() };
        const nextHistory = [...messages, userMsg];
        setMessages(nextHistory);
        setInput("");
        setIsSending(true);

        try {
            const res = await axios.post("/api/chatbot", {
                uid: user.uid,
                messages: nextHistory.map(m => ({ role: m.role, content: m.content })),
            });
            const answer: string = res.data.answer || "…";
            const cards = res.data.recipeCards as { name: string; detail: string }[] | undefined;
            const priceLinks = res.data.priceLinks as PriceLink[] | undefined;
            const assistantMsg: Message = {
                role: "assistant",
                content: answer,
                cards: cards && cards.length > 0 ? cards : undefined,
                priceLinks: priceLinks && priceLinks.length > 0 ? priceLinks : undefined,
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (e: any) {
            console.error("Chat error:", e);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "죄송해요, 잠시 문제가 있었어요. 다시 시도해 주세요.",
            }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleSend = () => send(input);

    const resetChat = () => {
        setMessages([{ role: "assistant", content: GREETING }]);
        setInput("");
        setExpandedCard(null);
    };

    if (loading || !user) return null;

    // Only show quick suggestions when the conversation is fresh.
    const showSuggestions = messages.length === 1;

    return (
        <div className="relative w-full">
            <div className="pt-24 pb-40 px-4 sm:px-6 animate-fade-in-up w-full overflow-x-hidden box-border space-y-6">
                {/* Floating "reset" pill once conversation has started */}
                {messages.length > 1 && (
                    <div className="fixed bottom-[130px] right-4 z-[100]">
                        <button
                            onClick={resetChat}
                            className="flex items-center gap-2 px-3 py-2 rounded-full bg-surface-container-high/90 backdrop-blur-md border border-outline-variant/30 text-[10px] font-black uppercase tracking-widest text-on-surface-variant shadow-2xl hover:border-primary/50 hover:text-primary transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-sm">refresh</span>
                            새 대화
                        </button>
                    </div>
                )}

                {messages.map((msg, mi) => (
                    <div key={mi} className="flex flex-col gap-3">
                        <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20 ${
                                msg.role === "user"
                                    ? "bg-primary border-primary/50"
                                    : "bg-surface-container border-outline-variant/30"
                            }`}>
                                {msg.role === "user" ? <User className="w-5 h-5 text-black" /> : <Bot className="w-5 h-5 text-primary" />}
                            </div>
                            <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-lg shadow-black/20 whitespace-pre-wrap ${
                                msg.role === "user"
                                    ? "bg-primary/90 text-black font-semibold rounded-tr-none border border-primary/50"
                                    : "bg-surface-container border border-outline-variant/10 text-on-surface rounded-tl-none"
                            }`}>
                                {msg.content}
                            </div>
                        </div>

                        {msg.cards && msg.cards.length > 0 && (
                            <div className="pl-[52px] flex flex-col gap-2">
                                {msg.cards.map((card, ci) => {
                                    const isOpen = expandedCard?.msgIdx === mi && expandedCard?.cardIdx === ci;
                                    return (
                                        <div key={ci} className="rounded-xl bg-surface-container border border-primary/20 overflow-hidden">
                                            <button
                                                onClick={() => setExpandedCard(isOpen ? null : { msgIdx: mi, cardIdx: ci })}
                                                className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-container-high transition-colors"
                                            >
                                                <span className="text-sm font-bold text-on-surface">{card.name}</span>
                                                <ChevronRight className={`w-4 h-4 text-on-surface-variant transition-transform ${isOpen ? "rotate-90" : ""}`} />
                                            </button>
                                            {isOpen && (
                                                <div className="px-4 pb-4 text-[12px] leading-relaxed text-on-surface-variant whitespace-pre-wrap border-t border-outline-variant/10">
                                                    {card.detail}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {msg.priceLinks && msg.priceLinks.length > 0 && (
                            <div className="pl-[52px] flex flex-col gap-1.5">
                                <span className="text-[9px] uppercase tracking-[0.25em] text-on-surface-variant/50 font-black">가격 확인</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {msg.priceLinks.map((link, li) => (
                                        <a
                                            key={li}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-container border border-primary/20 hover:border-primary/50 transition-colors group"
                                        >
                                            <span className="text-[11px] font-bold text-on-surface group-hover:text-primary truncate">{link.title}</span>
                                            <ExternalLink className="w-3 h-3 text-on-surface-variant group-hover:text-primary shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {showSuggestions && (
                    <div className="pl-[52px] flex flex-wrap gap-2 animate-fade-in">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => send(s)}
                                disabled={isSending}
                                className="text-[11px] font-bold px-3 py-2 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {isSending && (
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div className="bg-surface-container border border-outline-variant/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-lg shadow-black/20">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                            </div>
                            <span className="text-xs text-on-surface-variant font-medium">생각 중…</span>
                        </div>
                    </div>
                )}

                <div ref={scrollAnchorRef} className="h-4" />
            </div>

            <div className="fixed bottom-[64px] left-0 right-0 max-w-[440px] mx-auto p-4 bg-[#131313]/95 backdrop-blur-xl border-t border-outline-variant/20 z-[90]">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="바텐더에게 물어보세요…"
                        disabled={isSending}
                        className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-5 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 shadow-inner disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        className="absolute right-2 p-2.5 bg-primary rounded-xl text-black hover:bg-primary-fixed transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
