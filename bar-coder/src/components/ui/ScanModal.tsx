"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, X, ScanLine, CheckCircle, AlertCircle, Loader2, Plus, RefreshCw, ImageUp } from "lucide-react";
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

interface ScanModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ScanModal({ isOpen, onClose }: ScanModalProps) {
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
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            getInventoryFields().then((fields: any[]) => {
                const catField = fields.find((f: any) => f.name === "category");
                if (catField?.select_options) setCategoryOptions(catField.select_options);
            }).catch(() => { });
            
            // 모달 열릴 때 초기 상태로
            setStatus("idle");
            setResult(null);
            setCapturedImage(null);
            setErrorMsg("");
            setVideoStream(null);
        } else {
            stopCamera();
        }
    }, [isOpen]);

    const startCamera = useCallback(async () => {
        try {
            setStatus("camera");
            setResult(null);
            setCapturedImage(null);
            setErrorMsg("");

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;
            setVideoStream(stream);
        } catch (err) {
            console.error("Camera error:", err);
            setErrorMsg("카메라에 접근할 수 없습니다. 권한을 확인해 주세요.");
            setStatus("error");
        }
    }, []);

    // 비디오 요소가 렌더링된 후(DOM에 마운트된 후) 스트림을 연결하도록 동기화
    useEffect(() => {
        if (status === "camera" && videoStream && videoRef.current) {
            videoRef.current.srcObject = videoStream;
            videoRef.current.play().catch((e) => console.error("Video play error:", e));
        }
    }, [status, videoStream]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setVideoStream(null);
    }, []);

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
    }, []);

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#1a1a1a] flex flex-col overflow-y-auto overflow-x-hidden animate-fade-in-up scrollbar-hide">
            {/* 상단 닫기 버튼 */}
            <button
                onClick={onClose}
                className="absolute top-12 right-6 z-50 p-2.5 rounded-full bg-[#1a1a1a]/40 backdrop-blur-md border border-white/10 text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-all active:scale-90"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center pt-24 pb-32 px-6 gap-10 max-w-sm mx-auto w-full min-h-[100dvh]">
                {/* IDLE - 시작 화면 */}
                {status === "idle" && (
                    <div className="flex flex-col items-center gap-8 animate-fade-in-up w-full mt-4">
                        <div className="relative group mt-8">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-110 group-hover:scale-125 transition-transform duration-1000"></div>
                            <div className="w-36 h-36 rounded-[2.5rem] bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/20 flex items-center justify-center relative z-10 shadow-2xl overflow-hidden group-hover:border-primary/40 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                                <ScanLine className="w-14 h-14 text-primary drop-shadow-[0_0_15px_rgba(212,168,67,0.4)]" />
                            </div>
                            <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl z-20 border-[4px] border-[#1a1a1a] group-hover:scale-110 transition-transform">
                                <Camera className="w-5 h-5 text-black" />
                            </div>
                        </div>
                        <div className="text-center space-y-3 mt-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] mb-1.5 block">Quick Registration</span>
                                <h2 className="text-3xl sm:text-4xl font-headline italic text-on-surface leading-tight">Identify Your Spirits</h2>
                            </div>
                            <p className="text-sm text-on-surface-variant font-body leading-relaxed opacity-70 px-4 mt-3">
                                카메라로 술병 라벨을 촬영해 보세요.<br />
                                AI가 이름, 도수, 용량을 즉각 인식합니다.
                            </p>
                        </div>
                        <div className="space-y-4 w-full mt-6">
                            <button
                                onClick={startCamera}
                                className="w-full py-4 bg-primary text-black font-label font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] text-sm"
                            >
                                <Camera className="w-5 h-5" />
                                Start Camera
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 bg-surface-container-low/40 backdrop-blur-md border border-outline-variant/20 text-on-surface-variant font-label font-bold uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-surface-container-high/60 hover:text-on-surface active:scale-[0.98] text-sm"
                            >
                                <ImageUp className="w-5 h-5 text-primary/70" />
                                Upload Photo
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={uploadFromFile}
                        />

                        <div className="mt-6 px-6 py-4 rounded-2xl bg-surface-container-low/20 border border-outline-variant/10 text-center w-full">
                            <p className="text-[10px] text-on-surface-variant/50 font-medium italic tracking-wide">
                                "밝은 곳에서 라벨을 정면으로 촬영하면 더욱 정확합니다."
                            </p>
                        </div>
                    </div>
                )}

                {/* CAMERA - 카메라 뷰 */}
                {status === "camera" && (
                    <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-fade-in-up mt-8">
                        <div className="relative w-full rounded-[1.5rem] overflow-hidden border-2 border-outline-variant/40 bg-black aspect-[3/4] shadow-2xl">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                playsInline
                                muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="relative w-56 h-72">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                                    
                                    <div className="absolute left-1 right-1 h-[1.5px] bg-gradient-to-r from-transparent via-primary/80 to-transparent shadow-[0_0_15px_rgba(212,168,67,1)] top-1/2 -translate-y-1/2 animate-pulse" />
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-0 right-0 text-center px-6">
                                <span className="text-[9px] font-label uppercase tracking-widest text-white/80 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">Align bottle label within guide</span>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { stopCamera(); setStatus("idle"); }}
                                className="flex-1 py-3 bg-surface-container-low/40 backdrop-blur-md border border-outline-variant/20 text-on-surface-variant font-label font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-[0.95] text-xs"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                            <button
                                onClick={captureAndScan}
                                className="flex-[2] py-3 bg-primary text-black font-label font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-primary/20 active:scale-[0.98] hover:scale-[1.02] text-xs"
                            >
                                <ScanLine className="w-4 h-4" />
                                Analyze
                            </button>
                        </div>
                    </div>
                )}

                {/* SCANNING - AI 분석 중 */}
                {status === "scanning" && (
                    <div className="flex flex-col items-center gap-8 animate-fade-in-up max-w-sm w-full mt-12">
                        {capturedImage && (
                            <div className="w-full rounded-[1.5rem] overflow-hidden border border-outline-variant/20 aspect-[3/4] bg-black shadow-2xl relative">
                                <img src={capturedImage} alt="captured" className="w-full h-full object-cover opacity-60 grayscale blur-[2px]" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent"></div>
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-4 -mt-24 relative z-10">
                            <div className="w-16 h-16 bg-surface-container-high/60 backdrop-blur-2xl border border-primary/30 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <div className="text-center bg-[#1a1a1a]/40 backdrop-blur-xl px-6 py-4 rounded-[1.5rem] border border-outline-variant/10 shadow-2xl">
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-1.5 block">Processing</span>
                                <h3 className="text-lg font-headline italic text-on-surface mb-0.5 text-primary leading-none">Deciphering...</h3>
                                <p className="text-[10px] font-body text-on-surface-variant opacity-70">Gemini Vision is identifying spirits</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESULT - 인식 결과 */}
                {status === "result" && result && (
                    <div className="w-full max-w-sm flex flex-col gap-4 animate-fade-in-up mt-8">
                        <div className="relative group overflow-hidden rounded-[1.5rem] bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/20 shadow-2xl">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                            
                            {capturedImage && (
                                <div className="w-full h-36 relative overflow-hidden">
                                    <img src={capturedImage} alt="scanned" className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent"></div>
                                    <div className="absolute top-3 left-3 px-2.5 py-0.5 bg-primary/90 text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5">
                                        <CheckCircle className="w-2.5 h-2.5" />
                                        Recognized
                                    </div>
                                </div>
                            )}

                            <div className="p-6 space-y-4">
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-bold text-primary uppercase tracking-[0.3em]">Spirits Name</span>
                                    <h3 className="text-2xl font-headline italic text-on-surface leading-tight line-clamp-2">{result.name}</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-surface-container/40 rounded-xl p-3 text-center border border-outline-variant/10">
                                        <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Category</p>
                                        <p className="text-[10px] font-black text-primary truncate">{result.category}</p>
                                    </div>
                                    <div className="bg-surface-container/40 rounded-xl p-3 text-center border border-outline-variant/10">
                                        <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">ABV</p>
                                        <p className="text-[10px] font-black text-on-surface">{result.abv}%</p>
                                    </div>
                                    <div className="bg-surface-container/40 rounded-xl p-3 text-center border border-outline-variant/10">
                                        <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Vol</p>
                                        <p className="text-[10px] font-black text-on-surface">{result.volume}ml</p>
                                    </div>
                                </div>
                                {result.info && (
                                    <div className="bg-black/20 rounded-xl p-4 border border-outline-variant/10 italic relative">
                                        <div className="absolute -top-1.5 left-4 px-1.5 bg-surface-container-low text-[7px] font-black uppercase tracking-widest text-on-surface-variant">Note</div>
                                        <p className="text-[10px] text-on-surface-variant leading-relaxed opacity-80 line-clamp-4">{result.info}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { stopCamera(); setStatus("idle"); setResult(null); setCapturedImage(null); }}
                                className="flex-1 py-3 bg-surface-container-low/40 backdrop-blur-md border border-outline-variant/20 text-on-surface-variant font-label font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-white/5 text-[10px] active:scale-95"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Retry
                            </button>
                            <button
                                onClick={addToInventory}
                                disabled={result.name === "인식 불가"}
                                className="flex-[2] py-3 bg-primary text-black font-label font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-primary/20 active:scale-95 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
                            >
                                <Plus className="w-4 h-4" />
                                Add to Bar
                            </button>
                        </div>
                    </div>
                )}

                {/* DONE - 등록 완료 */}
                {status === "done" && result && (
                    <div className="flex flex-col items-center gap-6 animate-fade-in-up max-w-sm w-full text-center mt-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500/20 blur-3xl animate-pulse"></div>
                            <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center relative z-10 shadow-2xl">
                                <CheckCircle className="w-12 h-12 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.4em] mb-1.5 block">Success</span>
                                <h2 className="text-3xl font-headline italic text-on-surface">Spirit Registered</h2>
                            </div>
                            <p className="text-sm text-on-surface-variant font-body leading-relaxed opacity-80 px-8">
                                <span className="text-primary font-bold not-italic">{result.name}</span> has been curated into your private bar library.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full mt-6">
                            <button
                                onClick={() => { onClose(); router.push("/mypage"); }}
                                className="w-full py-4 bg-primary text-black font-label font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] text-sm"
                            >
                                View My Inventory
                            </button>
                            <button
                                onClick={() => { setStatus("idle"); setResult(null); setCapturedImage(null); }}
                                className="w-full py-4 bg-surface-container-low/40 backdrop-blur-md border border-outline-variant/20 text-on-surface-variant font-label font-bold uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-surface-container-high active:scale-[0.98] text-sm"
                            >
                                Scan more
                            </button>
                        </div>
                    </div>
                )}

                {/* ADDING - 등록 중 */}
                {status === "adding" && (
                    <div className="flex flex-col items-center gap-6 animate-fade-in-up mt-24">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl animate-spin-slow"></div>
                            <div className="w-24 h-24 bg-surface-container-high/60 backdrop-blur-2xl border border-primary/30 rounded-3xl flex items-center justify-center shadow-2xl">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-headline italic text-on-surface mb-1.5">Cataloging...</h3>
                            <p className="text-xs font-body text-on-surface-variant opacity-70 uppercase tracking-widest">Adding to your collection</p>
                        </div>
                    </div>
                )}

                {/* ERROR - 오류 */}
                {status === "error" && (
                    <div className="flex flex-col items-center gap-8 animate-fade-in-up max-w-sm w-full text-center mt-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500/20 blur-3xl animate-pulse"></div>
                            <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center relative z-10 shadow-2xl">
                                <AlertCircle className="w-12 h-12 text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.4em] mb-2 block">Detection Error</span>
                                <h2 className="text-3xl font-headline italic text-on-surface">Curation Failed</h2>
                            </div>
                            <p className="text-sm text-on-surface-variant font-body leading-relaxed opacity-80 px-8">
                                {errorMsg || "라벨을 인식할 수 없습니다. 조명을 조절하거나 다시 촬영해 보세요."}
                            </p>
                        </div>
                        <button
                            onClick={() => { setStatus("idle"); setCapturedImage(null); setErrorMsg(""); }}
                            className="w-full py-4 bg-primary text-black font-label font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-[0.95]"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Try Again
                        </button>
                    </div>
                )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
