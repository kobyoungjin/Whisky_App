import React from "react";

interface SkeletonCardProps {
    className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = "" }) => {
    return (
        <div className={`glass-card p-6 flex flex-col gap-4 ${className}`}>
            <div className="skeleton-shimmer w-1/3 h-4 rounded-md" />
            <div className="skeleton-shimmer w-full h-8 rounded-md" />
            <div className="flex gap-2">
                <div className="skeleton-shimmer w-12 h-4 rounded-full" />
                <div className="skeleton-shimmer w-12 h-4 rounded-full" />
                <div className="skeleton-shimmer w-12 h-4 rounded-full" />
            </div>
        </div>
    );
};

export default SkeletonCard;
