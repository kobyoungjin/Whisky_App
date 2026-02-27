"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Bot, Sparkles, Moon, PartyPopper, CakeSlice, Loader2, ChevronDown } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type Step = "intro" | "choice" | "input" | "loading" | "result" | "recipe_recommendation";




const SCENARIOS = []; // Removed


export default function ChatBot() {
    const { user, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<Step>("intro");

    const [messages, setMessages] = useState<Message[]>([]);

    const [input, setInput] = useState("");
    const [searchMode, setSearchMode] = useState<"inventory" | "all" | "">("");
    const [recipes, setRecipes] = useState<any[]>([]);

    const [recommendedRecipes, setRecommendedRecipes] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 스크롤 하단 고정
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, step, isOpen]);

    const handleScenarioSelect = (scenario: string) => {
        // Obsolete, but keeping for compatibility if needed or removing
    };

    const handleModeSelect = (mode: "inventory" | "all") => {
        setSearchMode(mode);
        setStep("input");
        const msg = mode === "inventory"
            ? "술장에 있는 재료로 만들 수 있는 최고의 칵테일을 찾아드릴게요! 함께 드실 안주가 무엇인가요?"
            : "전체 레시피 목록에서 안주와 가장 잘 어울리는 칵테일을 추천해 드릴게요! 어떤 안주를 준비하셨나요?";
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
                recipes: allRecipes.map(r => ({ name: r.name })),
                searchMode: searchMode
            });

            if (response.data.recommendations) {
                setRecommendedRecipes(response.data.recommendations);
                setMessages(prev => [
                    ...prev,
                    { role: "assistant", content: response.data.answer }
                ]);
                setStep("recipe_recommendation");
            } else {
                setMessages(prev => [
                    ...prev,
                    { role: "assistant", content: response.data.answer }
                ]);
                setStep("result");
            }
        } catch (error) {
            console.error("Contextual match error", error);
            setMessages(prev => [
                ...prev,
                { role: "assistant", content: "추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }
            ]);
            setStep("result");
        }
    };

    const handleMainButtonClick = async () => {
        setStep("choice");
        setMessages([{ role: "assistant", content: "어떤 방식으로 칵테일을 검색할까요?" }]);
    };

    const handleRandomRecommendation = async () => {
        // Redefined as the main entry
        handleMainButtonClick();
    };

    const handleShowRecipe = (rec: any) => {
        // rec is { name, detail } from AI
        setMessages(prev => [
            ...prev,
            { role: "assistant", content: `${rec.name}\n\n${rec.detail}` }
        ]);
        setStep("result");
    };


    const handleSend = async () => {
        if (!input.trim() || !user) return;

        if (searchMode && messages.length === 1) {
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
                uid: user.uid
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
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[calc(100vw-3rem)] sm:w-96 h-[500px] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="p-4 bg-[#2a2a2a]/50 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#d4a843]/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-[#d4a843]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#f0ede8]">AI 바텐더 추천</h3>
                                <p className="text-[10px] text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Online
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={resetChat} className="p-2 text-[#6b6761] hover:text-[#f0ede8] transition-colors">
                                <Loader2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 text-[#6b6761] hover:text-[#f0ede8] transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                        {/* Initial Greeting Bubble */}
                        {messages.length === 0 && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-[#d4a843]" />
                                </div>
                                <div className="bg-[#2a2a2a] border border-white/5 p-3 rounded-2xl rounded-tl-none max-w-[85%]">
                                    <p className="text-sm text-[#f0ede8] leading-relaxed">
                                        어서오세요! 당신만을 위한 홈바 바텐더입니다. 어떤 안주와 함께 마실 칵테일을 찾아드릴까요?
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step: Intro (Main Button) */}
                        {step === "intro" && messages.length === 0 && (
                            <div className="ml-11 flex flex-col gap-2 animate-fade-in mb-4">
                                <button
                                    onClick={handleMainButtonClick}
                                    className="flex items-center gap-3 w-full p-4 rounded-xl bg-gradient-to-r from-[#d4a843]/20 to-[#e8c06a]/10 border border-[#d4a843]/30 text-sm font-bold text-[#f0ede8] hover:from-[#d4a843]/30 hover:to-[#e8c06a]/20 transition-all text-left shadow-lg shadow-black/20"
                                >
                                    <Sparkles className="w-4 h-4 text-[#d4a843]" />
                                    안주 맞춤 칵테일 추천
                                </button>
                            </div>
                        )}

                        {/* Step: Choice (New Search Mode Selection) */}
                        {step === "choice" && (
                            <div className="ml-11 flex flex-col gap-2 animate-fade-in mb-4">
                                <button
                                    onClick={() => handleModeSelect("inventory")}
                                    className="flex items-center gap-3 w-full p-4 rounded-xl bg-[#2a2a2a] border border-[#d4a843]/20 text-xs font-bold text-[#f0ede8] hover:border-[#d4a843] transition-all text-left shadow-lg"
                                >
                                    <Bot className="w-4 h-4 text-[#d4a843]" />
                                    현재 술장에 있는 재료로 검색
                                </button>
                                <button
                                    onClick={() => handleModeSelect("all")}
                                    className="flex items-center gap-3 w-full p-4 rounded-xl bg-[#2a2a2a] border border-[#d4a843]/20 text-xs font-bold text-[#f0ede8] hover:border-[#d4a843] transition-all text-left shadow-lg"
                                >
                                    <Sparkles className="w-4 h-4 text-[#d4a843]" />
                                    모든 레시피로 검색
                                </button>
                            </div>
                        )}



                        {/* Chat History */}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                <div className={`w-8 h-8 rounded-full border border-white/5 flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-[#d4a843]" : "bg-[#2a2a2a]"}`}>
                                    {msg.role === "user" ? <User className="w-4 h-4 text-black" /> : <Bot className="w-4 h-4 text-[#d4a843]" />}
                                </div>
                                <div className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${msg.role === "user"
                                    ? "bg-[#d4a843] text-black font-medium rounded-tr-none"
                                    : "bg-[#2a2a2a] border border-white/5 text-[#f0ede8] rounded-tl-none whitespace-pre-wrap prose prose-invert prose-sm"
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {/* Step: Recipe Recommendations */}
                        {step === "recipe_recommendation" && (
                            <div className="ml-11 flex flex-col gap-2 animate-fade-in pb-4">
                                {recommendedRecipes.map((recipe, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleShowRecipe(recipe)}
                                        className="flex flex-col w-full p-4 rounded-xl bg-[#2a2a2a] border border-[#d4a843]/20 text-left hover:border-[#d4a843]/50 transition-all group"
                                    >
                                        <div className="flex justify-between items-center w-full mb-1">
                                            <span className="text-sm font-bold text-[#f0ede8] group-hover:text-[#d4a843] truncate">{recipe.name}</span>
                                        </div>
                                        <span className="text-[10px] text-[#6b6761] line-clamp-1">상세 레시피 확인하기</span>
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setStep("choice");
                                        setSearchMode("");
                                        setMessages([{ role: "assistant", content: "어떤 방식으로 다시 추천받을까요?" }]);
                                    }}
                                    className="text-center py-2 text-[10px] font-medium text-[#6b6761] hover:text-[#d4a843] transition-colors"
                                >
                                    추천 다시 받기
                                </button>


                            </div>
                        )}


                        {/* Step: Loading AI */}
                        {step === "loading" && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-[#d4a843]" />
                                </div>
                                <div className="bg-[#2a2a2a] border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce" />
                                    </div>
                                    <span className="text-[10px] text-[#6b6761] font-medium">바텐더가 술장을 살피는 중...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Footer */}
                    {(step === "input" || step === "result") && (
                        <div className="p-4 bg-[#2a2a2a]/50 border-t border-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                    placeholder="어떤 안주인가요? (예: 감자칩, 치킨...)"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f0ede8] placeholder-[#6b6761] focus:outline-none focus:border-[#d4a843]/50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#d4a843] rounded-lg text-black hover:bg-[#e8c16d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 group ${isOpen
                    ? "bg-[#2a2a2a] border border-white/10 text-[#d4a843] rotate-90"
                    : "bg-[#d4a843] text-black hover:scale-110 active:scale-95"
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 group-hover:animate-pulse" />}
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-[#1a1a1a] rounded-full" />
                )}
            </button>
        </div>
    );
}
