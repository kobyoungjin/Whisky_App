"use client";

import React from "react";
import Spinner from "./Spinner";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
    loading,
    children,
    className = "",
    disabled,
    ...props
}) => {
    return (
        <button
            className={`btn-gold relative flex items-center justify-center px-6 py-3 rounded-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
            disabled={loading || disabled}
            {...props}
        >
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner size="sm" className="text-current" />
                </div>
            )}
            <div className={loading ? "opacity-0" : "opacity-100"}>{children}</div>
        </button>
    );
};

export default LoadingButton;
