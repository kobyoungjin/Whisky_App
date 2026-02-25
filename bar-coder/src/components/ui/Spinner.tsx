import React from "react";

interface SpinnerProps {
    className?: string;
    size?: "sm" | "md" | "lg";
}

const Spinner: React.FC<SpinnerProps> = ({ className = "", size = "md" }) => {
    const sizeClasses = {
        sm: "w-4 h-4 border-2",
        md: "w-6 h-6 border-2",
        lg: "w-8 h-8 border-3",
    };

    return (
        <div
            className={`spinner rounded-full border-transparent border-t-current ${sizeClasses[size]} ${className}`}
            role="status"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default Spinner;
