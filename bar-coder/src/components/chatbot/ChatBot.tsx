"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Bot, Sparkles, Moon, PartyPopper, CakeSlice, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type Step = "scenario" | "input" | "loading" | "result";

const SCENARIOS = [
    { id: "가벼운 혼술", label: "🌙 가벼운 혼술", icon: <Moon className="w-4 h-4" /> },
    { id: "친구들과 요리 안주", label: "🎉 친구들과 요리 안주", icon: <PartyPopper className="w-4 h-4" /> },
    { id: "달콤한 디저트", label: "🍰 달콤한 디저트", icon: <CakeSlice className="w-4 h-4" /> },
];

export default function ChatBot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<Step>("scenario");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [selectedScenario, setSelectedScenario] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 스크롤 하단 고정
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, step, isOpen]);

    const handleScenarioSelect = (scenario: string) => {
        setSelectedScenario(scenario);
        setStep("input");
        setMessages([
            { role: "assistant", content: `좋아요! **${scenario}** 상황이시군요. 함께 곁들일 **안주**를 알려주시면, 술장에 있는 술로 최적의 조합을 찾아드릴게요!` }
        ]);
    };

    const handleSend = async () => {
        if (!input.trim() || !user) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setStep("loading");

        try {
            const response = await axios.post("/api/chatbot", {
                food: userMsg,
                scenario: selectedScenario,
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
        setStep("scenario");
        setMessages([]);
        setSelectedScenario("");
        setInput("");
    };

    if (!user) return null;

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
                        {/* Initial Greeting */}
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-white/5 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-[#d4a843]" />
                            </div>
                            <div className="bg-[#2a2a2a] border border-white/5 p-3 rounded-2xl rounded-tl-none max-w-[85%]">
                                <p className="text-sm text-[#f0ede8] leading-relaxed">
                                    어서오세요! 당신만을 위한 **홈바 바텐더**입니다. 지금 가장 어울리는 술을 추천해 드릴게요. 어떤 상황이신가요?
                                </p>
                            </div>
                        </div>

                        {/* Step: Scenario Selection */}
                        {step === "scenario" && (
                            <div className="ml-11 flex flex-col gap-2 animate-fade-in">
                                {SCENARIOS.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleScenarioSelect(s.id)}
                                        className="flex items-center gap-3 w-full p-3 rounded-xl bg-[#d4a843]/10 border border-[#d4a843]/20 text-xs font-medium text-[#d4a843] hover:bg-[#d4a843]/20 transition-all text-left"
                                    >
                                        {s.icon}
                                        {s.label}
                                    </button>
                                ))}
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
