import React from "react";

interface SkeletonLoaderProps {
  variant?: "cards" | "graph" | "path" | "clusters" | "text";
  count?: number;
}

export default function SkeletonLoader({
  variant = "cards",
  count = 6,
}: SkeletonLoaderProps) {
  if (variant === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-xl bg-slate-200/80 dark:bg-slate-800/40 border border-slate-300/60 dark:border-slate-700/30 p-5 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="h-6 w-20 bg-slate-300 dark:bg-slate-700/60 rounded-md mb-2"></div>
                <div className="h-4 w-28 bg-slate-300/60 dark:bg-slate-700/40 rounded"></div>
              </div>
              <div className="h-6 w-16 bg-slate-300/80 dark:bg-slate-700/50 rounded-full"></div>
            </div>
            <div className="h-3 w-32 bg-slate-300/50 dark:bg-slate-700/30 rounded mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "graph") {
    return (
      <div className="w-full h-[550px] rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center animate-pulse relative overflow-hidden">
        <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mb-4" />
        <div className="h-5 w-48 bg-slate-300 dark:bg-slate-800 rounded mb-2"></div>
        <div className="h-3 w-64 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
      </div>
    );
  }

  if (variant === "path") {
    return (
      <div className="w-full rounded-2xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 animate-pulse">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <React.Fragment key={i}>
              <div className="w-32 h-24 rounded-xl bg-slate-200 dark:bg-slate-800/60 p-3 flex flex-col justify-center items-center gap-2">
                <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 rounded"></div>
                <div className="w-16 h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded"></div>
              </div>
              {i < 3 && (
                <div className="h-2 w-16 bg-slate-300 dark:bg-slate-700/40 rounded hidden md:block"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "clusters") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-slate-200/70 dark:bg-slate-800/40 border border-slate-300/60 dark:border-slate-700/30 p-6 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 w-24 bg-slate-300 dark:bg-slate-700/60 rounded"></div>
              <div className="h-6 w-20 bg-slate-300/80 dark:bg-slate-700/50 rounded-full"></div>
            </div>
            <div className="space-y-3">
              <div className="h-10 bg-slate-300/70 dark:bg-slate-700/40 rounded-lg"></div>
              <div className="h-10 bg-slate-300/70 dark:bg-slate-700/40 rounded-lg"></div>
              <div className="h-10 bg-slate-300/70 dark:bg-slate-700/40 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-slate-300 dark:bg-slate-800 rounded w-3/4"></div>
      <div className="h-4 bg-slate-300 dark:bg-slate-800 rounded w-full"></div>
      <div className="h-4 bg-slate-300 dark:bg-slate-800 rounded w-5/6"></div>
    </div>
  );
}
