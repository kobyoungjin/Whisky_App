"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, ScanLine, ChevronLeft, CheckCircle, AlertCircle, Loader2, Plus, RefreshCw, ImageUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { addInventoryItem, getInventoryFields } from "@/lib/baserow";

type ScanResult = {
    name: string;
    category: string;
    abv: number;
    volume: number;
    info: string;
};

type ScanStatus = "idle" | "camera" | "scanning" | "result" | "adding" | "done" | "error";

export default function ScanPage() {
    const router = useRouter();
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [status, setStatus] = useState<ScanStatus>("idle");
    const [result, setResult] = useState<ScanResult | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [categoryOptions, setCategoryOptions] = useState<{ id: number; value: string }[]>([]);

    // 카테고리 옵션 로드
    useEffect(() => {
        getInventoryFields().then((fields: any[]) => {
            const catField = fields.find((f: any) => f.name === "category");
            if (catField?.select_options) setCategoryOptions(catField.select_options);
        }).catch(() => { });
    }, []);

    // 카메라 시작
    const startCamera = useCallback(async () => {
        try {
            setStatus("camera");
            setResult(null);
            setCapturedImage(null);
            setErrorMsg("");

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" }, // 후면 카메라 우선
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error("Camera error:", err);
            setErrorMsg("카메라에 접근할 수 없습니다. 브라우저 설정에서 카메라 권한을 허용해 주세요.");
            setStatus("error");
        }
    }, []);

    // 카메라 정지
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // 사진 촬영 및 분석
    const captureAndScan = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImage(imageBase64);
        stopCamera();
        setStatus("scanning");

        try {
            const res = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64 })
            });

            const data = await res.json();
            if (data.error) {
                setErrorMsg(data.error);
                setStatus("error");
                return;
            }

            setResult(data);
            setStatus("result");
        } catch (err) {
            setErrorMsg("분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
            setStatus("error");
        }
    }, [stopCamera]);

    // 술장에 추가
    const addToInventory = useCallback(async () => {
        if (!result || !user) return;
        setStatus("adding");

        try {
            const matchedOption = categoryOptions.find(opt =>
                opt.value === result.category ||
                opt.value.toLowerCase().includes(result.category.toLowerCase())
            );
            const categoryValue = matchedOption ? matchedOption.id : result.category;

            await addInventoryItem(user.uid, {
                name: result.name,
                abv: result.abv,
                volume: result.volume,
                category: categoryValue as any
            });

            setStatus("done");
        } catch (err) {
            setErrorMsg("술장 등록 중 오류가 발생했습니다.");
            setStatus("error");
        }
    }, [result, user, categoryOptions]);

    // 이미지 파일 업로드 후 스캔
    const uploadFromFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const imageBase64 = ev.target?.result as string;
            if (!imageBase64) return;

            setCapturedImage(imageBase64);
            setResult(null);
            setErrorMsg("");
            setStatus("scanning");

            try {
                const res = await fetch("/api/scan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageBase64 })
                });
                const data = await res.json();
                if (data.error) {
                    setErrorMsg(data.error);
                    setStatus("error");
                    return;
                }
                setResult(data);
                setStatus("result");
            } catch {
                setErrorMsg("분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
                setStatus("error");
            }
        };
        reader.readAsDataURL(file);
        // input 초기화 (같은 파일 재업로드 허용)
        e.target.value = "";
    }, []);

    // 페이지 떠날 때 카메라 정지
    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-[#1a1a1a]/80 backdrop-blur-xl sticky top-0 z-10">
                <button
                    onClick={() => { stopCamera(); router.back(); }}
                    className="p-2 rounded-xl text-[#a8a49d] hover:text-[#f0ede8] hover:bg-white/5 transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-base font-bold text-[#f0ede8]">Smart Scanner</h1>
                    <p className="text-[10px] text-[#6b6761]">AI가 술병을 자동으로 인식합니다</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4a843] animate-pulse" />
                    <span className="text-[10px] text-[#d4a843] font-bold">Gemini Vision</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">

                {/* IDLE - 시작 화면 */}
                {status === "idle" && (
                    <div className="flex flex-col items-center gap-8 animate-fade-in-up max-w-sm w-full">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-3xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center">
                                <ScanLine className="w-16 h-16 text-[#d4a843]" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#d4a843] flex items-center justify-center shadow-lg">
                                <Camera className="w-4 h-4 text-black" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold text-[#f0ede8]">술병을 스캔하세요</h2>
                            <p className="text-sm text-[#6b6761] leading-relaxed">
                                카메라로 술병 라벨을 촬영하면<br />
                                AI가 자동으로 이름, 도수, 용량을 인식합니다.
                            </p>
                        </div>
                        <button
                            onClick={startCamera}
                            className="w-full py-4 bg-[#d4a843] hover:bg-[#c29738] text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#d4a843]/30 active:scale-95"
                        >
                            <Camera className="w-5 h-5" />
                            카메라로 스캔
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 bg-[#2a2a2a] border border-white/10 hover:border-[#d4a843]/40 text-[#f0ede8] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-[#d4a843]/5 active:scale-95"
                        >
                            <ImageUp className="w-5 h-5 text-[#d4a843]" />
                            사진 업로드로 스캔
                        </button>
                        {/* 숨겨진 파일 인풋 */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={uploadFromFile}
                        />
                    </div>
                )}

                {/* CAMERA - 카메라 뷰 */}
                {status === "camera" && (
                    <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-fade-in-up">
                        <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black aspect-[3/4]">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                playsInline
                                muted
                            />
                            {/* 스캔 가이드 오버레이 */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="relative w-48 h-64">
                                    {/* 모서리 가이드 */}
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#d4a843]" />
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#d4a843]" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#d4a843]" />
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#d4a843]" />
                                    {/* 스캔 라인 애니메이션 */}
                                    <div className="absolute left-0 right-0 h-0.5 bg-[#d4a843]/60 animate-[scan_2s_linear_infinite] top-0" />
                                </div>
                            </div>
                            <div className="absolute bottom-3 left-0 right-0 text-center">
                                <span className="text-[10px] text-white/60 bg-black/40 px-3 py-1 rounded-full">술병 라벨이 가이드 안에 오도록 맞춰주세요</span>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { stopCamera(); setStatus("idle"); }}
                                className="flex-1 py-3 bg-[#2a2a2a] border border-white/10 text-[#a8a49d] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-white/5"
                            >
                                <X className="w-4 h-4" />
                                취소
                            </button>
                            <button
                                onClick={captureAndScan}
                                className="flex-[2] py-3 bg-[#d4a843] hover:bg-[#c29738] text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#d4a843]/30 active:scale-95"
                            >
                                <ScanLine className="w-5 h-5" />
                                촬영 및 분석
                            </button>
                        </div>
                    </div>
                )}

                {/* SCANNING - AI 분석 중 */}
                {status === "scanning" && (
                    <div className="flex flex-col items-center gap-6 animate-fade-in-up max-w-sm w-full">
                        {capturedImage && (
                            <div className="w-full rounded-2xl overflow-hidden border border-white/10 aspect-[3/4] bg-black">
                                <img src={capturedImage} alt="captured" className="w-full h-full object-cover opacity-50" />
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-3 -mt-20 relative z-10">
                            <div className="w-16 h-16 bg-[#1a1a1a] border border-[#d4a843]/30 rounded-2xl flex items-center justify-center shadow-2xl">
                                <Loader2 className="w-8 h-8 text-[#d4a843] animate-spin" />
                            </div>
                            <div className="text-center bg-[#1a1a1a]/90 backdrop-blur px-6 py-3 rounded-2xl border border-white/10">
                                <p className="text-sm font-bold text-[#f0ede8]">AI가 분석 중...</p>
                                <p className="text-xs text-[#6b6761] mt-1">Gemini Vision으로 술병을 인식합니다</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESULT - 인식 결과 */}
                {status === "result" && result && (
                    <div className="w-full max-w-sm flex flex-col gap-4 animate-fade-in-up">
                        {/* 인식된 이미지 썸네일 */}
                        {capturedImage && (
                            <div className="w-full h-36 rounded-2xl overflow-hidden border border-white/10">
                                <img src={capturedImage} alt="scanned" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {/* 결과 카드 */}
                        <div className="bg-[#2a2a2a] border border-[#d4a843]/20 rounded-2xl overflow-hidden">
                            <div className="bg-[#d4a843]/10 px-5 py-3 border-b border-[#d4a843]/20 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-[#d4a843]" />
                                <span className="text-xs font-bold text-[#d4a843] uppercase tracking-wider">인식 완료</span>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-[10px] text-[#6b6761] uppercase tracking-wider mb-1">술 이름</p>
                                    <p className="text-xl font-black text-[#f0ede8]">{result.name}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                                        <p className="text-[9px] text-[#6b6761] uppercase tracking-wider mb-1">카테고리</p>
                                        <p className="text-xs font-bold text-[#d4a843]">{result.category}</p>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                                        <p className="text-[9px] text-[#6b6761] uppercase tracking-wider mb-1">도수</p>
                                        <p className="text-xs font-bold text-[#f0ede8]">{result.abv}%</p>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                                        <p className="text-[9px] text-[#6b6761] uppercase tracking-wider mb-1">용량</p>
                                        <p className="text-xs font-bold text-[#f0ede8]">{result.volume}ml</p>
                                    </div>
                                </div>
                                {result.info && (
                                    <div className="bg-[#1a1a1a] rounded-xl p-3">
                                        <p className="text-[10px] text-[#6b6761] uppercase tracking-wider mb-1.5">한줄 설명</p>
                                        <p className="text-xs text-[#a8a49d] leading-relaxed">{result.info}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { stopCamera(); setStatus("idle"); setResult(null); setCapturedImage(null); }}
                                className="flex-1 py-3 bg-[#2a2a2a] border border-white/10 text-[#a8a49d] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-white/5 text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                다시 스캔
                            </button>
                            <button
                                onClick={addToInventory}
                                disabled={result.name === "인식 불가"}
                                className="flex-[2] py-3 bg-[#d4a843] hover:bg-[#c29738] text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#d4a843]/30 active:scale-95 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                술장에 추가
                            </button>
                        </div>
                    </div>
                )}

                {/* DONE - 등록 완료 */}
                {status === "done" && result && (
                    <div className="flex flex-col items-center gap-6 animate-fade-in-up max-w-sm w-full text-center">
                        <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-12 h-12 text-green-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-[#f0ede8]">술장에 추가됐어요!</h2>
                            <p className="text-sm text-[#6b6761]">
                                <span className="text-[#d4a843] font-bold">{result.name}</span>이(가)<br />
                                술장에 등록되었습니다.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { setStatus("idle"); setResult(null); setCapturedImage(null); }}
                                className="flex-1 py-3 bg-[#2a2a2a] border border-white/10 text-[#a8a49d] font-bold rounded-2xl text-sm transition-all hover:bg-white/5"
                            >
                                계속 스캔
                            </button>
                            <button
                                onClick={() => router.push("/mypage")}
                                className="flex-[2] py-3 bg-[#d4a843] hover:bg-[#c29738] text-black font-bold rounded-2xl text-sm transition-all shadow-lg shadow-[#d4a843]/30"
                            >
                                술장 보기
                            </button>
                        </div>
                    </div>
                )}

                {/* ADDING - 등록 중 */}
                {status === "adding" && (
                    <div className="flex flex-col items-center gap-4 animate-fade-in-up">
                        <Loader2 className="w-10 h-10 text-[#d4a843] animate-spin" />
                        <p className="text-sm font-bold text-[#f0ede8]">술장에 추가하는 중...</p>
                    </div>
                )}

                {/* ERROR - 오류 */}
                {status === "error" && (
                    <div className="flex flex-col items-center gap-6 animate-fade-in-up max-w-sm w-full text-center">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-[#f0ede8]">인식에 실패했습니다</h2>
                            <p className="text-sm text-[#6b6761]">{errorMsg}</p>
                        </div>
                        <button
                            onClick={() => { setStatus("idle"); setCapturedImage(null); setErrorMsg(""); }}
                            className="w-full py-3 bg-[#d4a843] hover:bg-[#c29738] text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            다시 시도
                        </button>
                    </div>
                )}
            </div>

            {/* Canvas (숨김) */}
            <canvas ref={canvasRef} className="hidden" />

            <style jsx>{`
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: calc(100% - 2px); }
                    100% { top: 0; }
                }
            `}</style>
        </div>
    );
}
