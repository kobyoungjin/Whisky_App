"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Droplet } from "lucide-react";

interface BottleVolumeSliderProps {
    value: number;            // 현재 용량
    onChange: (val: number) => void;
    abvValue?: number;        // 도수 (ABV)
    onAbvChange?: (val: number) => void;
    maxVolume?: number;
    disabled?: boolean;       // 슬라이더 전체 비활성화 (드래그도 막음)
    abvReadOnly?: boolean;    // ABV만 0으로 고정 (비알코올 재료용, 슬라이더는 활성화)
    unit?: string;            // 단위 라벨 (ml / EA / MG …)
    step?: number;            // 스냅 단위 (기본 10)
}

export default function BottleVolumeSlider({
    value,
    onChange,
    abvValue = 40,
    onAbvChange,
    maxVolume = 1000,
    disabled = false,
    abvReadOnly = false,
    unit = "ml",
    step = 10,
}: BottleVolumeSliderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const clampedValue = Math.max(0, Math.min(value, maxVolume));
    const fillPercentage = (clampedValue / maxVolume) * 100;
    
    // SVG 내부의 액체(Liquid) 블록 상단 Y좌표 계산
    // 병의 가장 아래쪽이 대략 y=245, 가장 윗쪽이 대략 y=10 입니다.
    // 최대 채움 높이를 병목 아래(y=40) 정도까지만 잡으려면 (245 - 40 = 205) 만큼 채웁니다.
    const maxLiquidHeight = 205; 
    const liquidY = 245 - (maxLiquidHeight * (fillPercentage / 100));

    const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
        if (!isDragging || disabled || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
        
        const rawValue = (percentage / 100) * maxVolume;
        const snappedValue = Math.round(rawValue / step) * step;

        if (snappedValue !== value) {
            onChange(snappedValue);
        }
    }, [isDragging, disabled, maxVolume, value, onChange, step]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled) return;
        setIsDragging(true);
        handlePointerMove(e);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    useEffect(() => {
        const onGlobalUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener("pointerup", onGlobalUp);
        } else {
            window.removeEventListener("pointerup", onGlobalUp);
        }
        return () => window.removeEventListener("pointerup", onGlobalUp);
    }, [isDragging]);

    return (
        <div className="w-full flex flex-col items-center justify-center gap-0">
            {/* 핵심 레이아웃: 좌측 패널(Volume & ABV) vs 우측 패널(Bottle) 2단 분리 */}
            <div className="flex flex-row items-center justify-center w-full gap-6 px-2">
                
                {/* 좌측 패널: 입력 정보 영역 (겹침 방지) */}
                <div className="flex flex-col items-end justify-center gap-10 py-6 w-32 shrink-0">
                    
                    {/* Volume Input/Text */}
                    <div className="flex flex-col items-end leading-none w-full relative group">
                        <span className="text-[9px] uppercase font-black tracking-[0.2em] text-on-surface-variant/50 mb-1">Volume</span>
                        <div className="flex items-baseline gap-0.5 mt-1 border-b border-outline-variant/30 pb-0.5 focus-within:border-[#e8c678] transition-colors w-full justify-end">
                            <input 
                                type="number" 
                                value={value === 0 ? "" : Math.round(value).toString()} 
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val <= maxVolume) onChange(val);
                                    else onChange(maxVolume);
                                }}
                                disabled={disabled}
                                placeholder="0"
                                className="w-[4.5rem] bg-transparent text-right text-3xl font-headline italic font-extrabold text-[#e8c678] tabular-nums tracking-tighter focus:outline-none disabled:opacity-50"
                                step={step}
                                min="0"
                                max={maxVolume}
                            />
                            <span className="text-[10px] text-[#e8c678]/70 font-bold tracking-tighter ml-0.5">{unit}</span>
                        </div>
                    </div>

                    {/* ABV Input/Text */}
                    <div className="flex flex-col items-end leading-none w-full relative group">
                        <span className="text-[9px] uppercase font-black tracking-[0.2em] text-on-surface-variant/50 mb-1">ABV</span>
                        <div className="flex items-baseline gap-0.5 mt-1 border-b border-outline-variant/30 pb-0.5 focus-within:border-primary transition-colors w-full justify-end">
                            {abvReadOnly ? (
                                // 비알코올 재료: ABV는 항상 0으로 고정 표시
                                <span className="text-2xl font-headline italic font-extrabold text-on-surface/50 tabular-nums tracking-tighter">0</span>
                            ) : onAbvChange ? (
                                <input 
                                    type="number" 
                                    value={abvValue === 0 ? "" : abvValue?.toString()} 
                                    onChange={(e) => onAbvChange(Number(e.target.value))}
                                    disabled={disabled}
                                    placeholder="0"
                                    className="w-[3.5rem] bg-transparent text-right text-2xl font-headline italic font-extrabold text-on-surface tabular-nums tracking-tighter focus:outline-none disabled:opacity-50"
                                    step="0.1"
                                    min="0"
                                />
                            ) : (
                                <span className="text-2xl font-headline italic font-extrabold text-on-surface tabular-nums tracking-tighter opacity-50">{abvValue || 0}</span>
                            )}
                            <span className="text-[10px] text-on-surface-variant/60 font-bold tracking-tighter ml-0.5">%</span>
                        </div>
                    </div>
                </div>

                {/* 우측 패널: Bottle Interactive Slider */}
                <div 
                    ref={containerRef}
                    className={`relative w-28 h-56 mx-auto shrink-0 cursor-ns-resize touch-none transform origin-bottom ${disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300"}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* 안정적인 통합 SVG 렌더링: 비율 어긋남 원천 봉쇄 */}
                    <svg width="100%" height="100%" viewBox="0 0 120 250" className="absolute inset-0 pointer-events-none z-20 overflow-visible drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                        <defs>
                            {/* 리퀴드 그라데이션 */}
                            <linearGradient id="liquidGrad" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#8b6914" />
                                <stop offset="50%" stopColor="#d4a843" />
                                <stop offset="100%" stopColor="#e8c678" />
                            </linearGradient>
                            {/* 바틀 클리핑 마스크 */}
                            <clipPath id="bottleClip">
                                <path d="M 45 10 C 45 10, 75 10, 75 10 C 75 30, 70 40, 70 60 C 70 80, 100 100, 100 130 C 100 130, 100 230, 100 230 C 100 240, 95 245, 85 245 L 35 245 C 25 245, 20 240, 20 230 C 20 230, 20 130, 20 130 C 20 100, 50 80, 50 60 C 50 40, 45 30, 45 10 Z" />
                            </clipPath>
                        </defs>

                        {/* 배경 유리 질감 */}
                        <path 
                            d="M 45 10 C 45 10, 75 10, 75 10 C 75 30, 70 40, 70 60 C 70 80, 100 100, 100 130 C 100 130, 100 230, 100 230 C 100 240, 95 245, 85 245 L 35 245 C 25 245, 20 240, 20 230 C 20 230, 20 130, 20 130 C 20 100, 50 80, 50 60 C 50 40, 45 30, 45 10 Z" 
                            fill="rgba(255,255,255,0.03)" 
                        />

                        {/* 실제 액체 채움 (클립 마스크 안에서만 보임) */}
                        <g clipPath="url(#bottleClip)">
                            {value > 0 && (
                                <>
                                    {/* 몸통 채움 */}
                                    <rect 
                                        x="0" 
                                        y={liquidY} 
                                        width="120" 
                                        height={250 - liquidY} 
                                        fill="url(#liquidGrad)" 
                                        opacity="0.95" 
                                    />
                                    {/* 수면(표면) 하이라이트 */}
                                    <rect 
                                        x="0" 
                                        y={liquidY} 
                                        width="120" 
                                        height="3" 
                                        fill="#ffedb3" 
                                        opacity="0.8" 
                                    />
                                </>
                            )}
                        </g>

                        {/* 병 외곽선 라인 */}
                        <path 
                            d="M 45 10 C 45 10, 75 10, 75 10 C 75 30, 70 40, 70 60 C 70 80, 100 100, 100 130 C 100 130, 100 230, 100 230 C 100 240, 95 245, 85 245 L 35 245 C 25 245, 20 240, 20 230 C 20 230, 20 130, 20 130 C 20 100, 50 80, 50 60 C 50 40, 45 30, 45 10 Z" 
                            fill="none" 
                            stroke="rgba(255,255,255,0.15)" 
                            strokeWidth="3"
                            strokeLinejoin="round"
                        />
                        {/* 코르크 마개 */}
                        <rect x="42" y="0" width="36" height="15" fill="#3a2f24" rx="2" />
                        {/* 반사 하이라이트 */}
                        <path d="M 28 140 C 28 140, 28 220, 28 220" stroke="white" strokeOpacity="0.15" strokeWidth="2" strokeLinecap="round" />
                        
                        {/* MAX Indicator Text */}
                        <line x1="85" y1="130" x2="95" y2="130" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                        <text x="56" y="133" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="sans-serif" fontWeight="bold">MAX</text>
                        <line x1="85" y1="185" x2="95" y2="185" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        <line x1="85" y1="235" x2="95" y2="235" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    </svg>

                    {!disabled && isDragging && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none mix-blend-difference opacity-40">
                            <Droplet className="w-6 h-6 text-white animate-pulse" />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="text-center w-full mt-4">
                <p className="text-[9px] text-on-surface-variant/30 font-black uppercase tracking-[0.3em]">{disabled ? "Non-Alcoholic (0%)" : "Slide up/down or type volume"}</p>
            </div>
        </div>
    );
}
