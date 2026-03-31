"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { useRouter } from "next/navigation";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type Step = "intro" | "choice" | "input" | "loading" | "result" | "recipe_recommendation";

export default function ChatPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>("intro");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [searchMode, setSearchMode] = useState<"inventory" | "all" | "food_recommendation" | "">("");
    const [recommendedRecipes, setRecommendedRecipes] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, step]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    const handleModeSelect = (mode: "inventory" | "all" | "food_recommendation") => {
        setSearchMode(mode);
        setStep("input");
        let msg = "";
        if (mode === "inventory") {
            msg = "술장에 있는 재료로 만들 수 있는 최고의 칵테일을 찾아드릴게요! 함께 드실 안주가 무엇인가요?";
        } else if (mode === "all") {
            msg = "전체 레시피 목록에서 안주와 가장 잘 어울리는 칵테일을 추천해 드릴게요! 어떤 안주를 준비하셨나요?";
        } else {
            msg = "마시고 싶은 칵테일에 딱 맞는 안주를 추천해 드릴게요! 어떤 칵테일인가요?";
        }
        setMessages([{ role: "assistant", content: msg }]);
    };

    const handleContextualRecommendation = async () => {
        if (!input.trim() || !user) return;
        const userMsg = input;
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setInput("");
        setStep("loading");

        try {
            const { getRecipes } = await import("@/lib/baserow");
            const allRecipes = await getRecipes();

            const response = await axios.post("/api/chatbot", {
                food: userMsg,
                uid: user.uid,
                recipes: allRecipes.map((r: any) => ({ name: r.name })),
                searchMode: searchMode
            });

            if (response.data.recommendations) {
                setRecommendedRecipes(response.data.recommendations);
                setMessages(prev => [...prev, { role: "assistant", content: response.data.answer }]);
                setStep("recipe_recommendation");
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: response.data.answer }]);
                setStep("result");
            }
        } catch (error) {
            console.error("Contextual match error", error);
            setMessages(prev => [...prev, { role: "assistant", content: "추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }]);
            setStep("result");
        }
    };

    const handleMainButtonClick = async () => {
        setStep("choice");
        setMessages([{ role: "assistant", content: "어떤 방식으로 칵테일을 검색할까요?" }]);
    };

    const handleShowRecipe = (rec: any) => {
        setMessages(prev => [...prev, { role: "assistant", content: `${rec.name}\n\n${rec.detail}` }]);
        setStep("result");
    };

    const handleSend = async () => {
        if (!input.trim() || !user) return;

        // 첫 번째 메시지 전송 시 컨텍스트 기반 추천 처리 (안주 추천 모드 제외)
        if (searchMode && searchMode !== "food_recommendation" && messages.length === 1) {
            handleContextualRecommendation();
            return;
        }

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setStep("loading");

        try {
            const response = await axios.post("/api/chatbot", {
                food: userMsg,
                uid: user.uid,
                searchMode: searchMode // 검색 모드 전달
            });

            setMessages(prev => [...prev, { role: "assistant", content: response.data.answer }]);
            setStep("result");
        } catch (error) {
            console.error("Chatbot Error:", error);
            setMessages(prev => [...prev, { role: "assistant", content: "죄송해요, 바텐더가 잠시 자리를 비웠나 봐요. 잠시 후 다시 시도해 주세요! 😅" }]);
            setStep("result");
        }
    };

    const resetChat = () => {
        setStep("intro");
        setMessages([]);
        setSearchMode("");
        setInput("");
        setRecommendedRecipes([]);
    };

    if (loading || !user) return null;

    return (
        <div className="relative w-full">

            <div className="pt-24 pb-48 px-4 sm:px-6 animate-fade-in-up w-full overflow-x-hidden box-border space-y-6">
                {/* Floating Navigation Controls (Bottom Right - Fixed Overlap logic) */}
                {messages.length > 0 && (
                    <div className="fixed bottom-[130px] right-4 z-[100] flex flex-row gap-2 animate-fade-in">
                        {step === "result" && recommendedRecipes.length > 0 && (
                            <button
                                onClick={() => setStep("recipe_recommendation")}
                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-surface-container-high/90 backdrop-blur-md border border-primary/30 text-[10px] font-black uppercase tracking-widest text-primary shadow-2xl hover:bg-primary hover:text-black transition-all active:scale-95 group"
                            >
                                <span className="material-symbols-outlined text-sm">list</span>
                                목록으로
                            </button>
                        )}
                        <button
                            onClick={resetChat}
                            className="flex items-center gap-2 px-3 py-2 rounded-full bg-surface-container-high/90 backdrop-blur-md border border-outline-variant/30 text-[10px] font-black uppercase tracking-widest text-on-surface-variant shadow-2xl hover:border-primary/50 hover:text-primary transition-all active:scale-95 group"
                        >
                            <span className="material-symbols-outlined text-sm">refresh</span>
                            처음으로
                        </button>
                    </div>
                )}

                {messages.length === 0 && (
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full border border-outline-variant/30 bg-surface-container flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div className="bg-surface-container p-4 rounded-2xl rounded-tl-none max-w-[85%] border border-outline-variant/10 shadow-lg shadow-black/20">
                            <p className="text-sm text-on-surface leading-relaxed">
                                어서오세요! 당신만을 위한 홈바 바텐더입니다. 어떤 안주와 함께 마실 칵테일을 찾아드릴까요?
                            </p>
                        </div>
                    </div>
                )}

                {step === "intro" && messages.length === 0 && (
                    <div className="ml-13 flex flex-col gap-3 animate-fade-in relative pl-[52px]">
                        <button
                            onClick={handleMainButtonClick}
                            className="flex items-center gap-3 w-full p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary-container/10 border border-primary/30 text-sm font-bold text-on-surface hover:from-primary/30 hover:to-primary-container/20 transition-all text-left shadow-lg shadow-black/20"
                        >
                            <Sparkles className="w-4 h-4 text-primary" />
                            안주 맞춤 칵테일 추천
                        </button>
                        <button
                            onClick={() => handleModeSelect("food_recommendation")}
                            className="flex items-center gap-3 w-full p-4 rounded-xl bg-gradient-to-r from-secondary/20 to-secondary-container/10 border border-secondary/30 text-sm font-bold text-on-surface hover:from-secondary/30 hover:to-secondary-container/20 transition-all text-left shadow-lg shadow-black/20"
                        >
                            <span className="material-symbols-outlined text-primary text-lg">restaurant</span>
                            칵테일 맞춤 안주 추천
                        </button>
                    </div>
                )}

                {step === "choice" && (
                    <div className="ml-13 flex flex-col gap-3 animate-fade-in relative pl-[52px]">
                        <button
                            onClick={() => handleModeSelect("inventory")}
                            className="flex items-center gap-3 w-full p-4 rounded-xl bg-surface-container border border-primary/20 text-xs font-bold text-on-surface hover:border-primary transition-all text-left shadow-lg shadow-black/20"
                        >
                            <Bot className="w-4 h-4 text-primary" />
                            현재 술장에 있는 재료로 검색
                        </button>
                        <button
                            onClick={() => handleModeSelect("all")}
                            className="flex items-center gap-3 w-full p-4 rounded-xl bg-surface-container border border-primary/20 text-xs font-bold text-on-surface hover:border-primary transition-all text-left shadow-lg shadow-black/20"
                        >
                            <Sparkles className="w-4 h-4 text-primary" />
                            모든 레시피로 검색
                        </button>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20 ${msg.role === "user" ? "bg-primary border-primary/50" : "bg-surface-container border-outline-variant/30"}`}>
                            {msg.role === "user" ? <User className="w-5 h-5 text-black" /> : <Bot className="w-5 h-5 text-primary" />}
                        </div>
                        <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-lg shadow-black/20 ${msg.role === "user"
                            ? "bg-primary/90 text-black font-semibold rounded-tr-none border border-primary/50"
                            : "bg-surface-container border border-outline-variant/10 text-on-surface rounded-tl-none whitespace-pre-wrap prose prose-invert prose-sm"
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {step === "recipe_recommendation" && (
                    <div className="ml-13 flex flex-col gap-3 animate-fade-in relative pl-[52px] pb-4">
                        {recommendedRecipes.map((recipe, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleShowRecipe(recipe)}
                                className="flex flex-col w-full p-4 rounded-xl bg-surface-container border border-primary/20 text-left hover:border-primary/50 transition-all group shadow-md"
                            >
                                <div className="flex justify-between items-center w-full mb-1">
                                    <span className="text-sm font-bold text-on-surface group-hover:text-primary truncate">{recipe.name}</span>
                                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>chevron_right</span>
                                </div>
                                <span className="text-[10px] text-on-surface-variant line-clamp-1">상세 레시피 확인하기</span>
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setStep("choice");
                                setSearchMode("");
                                setMessages([{ role: "assistant", content: "어떤 방식으로 다시 추천받을까요?" }]);
                            }}
                            className="text-center py-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors mt-2"
                        >
                            추천 다시 받기
                        </button>
                    </div>
                )}

                {step === "loading" && (
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
                            <span className="text-xs text-on-surface-variant font-medium">바텐더가 술장을 살피는 중...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
            </div>

            {(step === "input" || step === "result") && (
                <div className="fixed bottom-[64px] left-0 right-0 max-w-[440px] mx-auto p-4 bg-[#131313]/95 backdrop-blur-xl border-t border-outline-variant/20 z-[90]">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSend()}
                            placeholder={searchMode === "food_recommendation" ? "어떤 칵테일인가요? (예: 진토닉, 네그로니...)" : "어떤 안주인가요? (예: 감자칩, 치킨...)"}
                            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-5 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 shadow-inner"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="absolute right-2 p-2.5 bg-primary rounded-xl text-black hover:bg-primary-fixed transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
