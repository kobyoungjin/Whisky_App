import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorAlertProps {
    message: string;
    onClose?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose }) => {
    return (
        <div className="glass-card flex items-start gap-4 p-4 border-red-500/50 bg-red-500/10 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-400">오류가 발생했습니다</h3>
                <p className="text-xs text-red-300/80 mt-1">{message}</p>
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-red-400/50 hover:text-red-400 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default ErrorAlert;
