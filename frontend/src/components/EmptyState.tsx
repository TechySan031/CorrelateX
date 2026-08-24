import React from "react";
import { SearchX, SlidersHorizontal, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = "No results found",
  message = "No correlations or items match your current filter threshold. Try adjusting the sliders.",
  icon: Icon = SearchX,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="w-full py-16 px-6 rounded-2xl glass-panel text-center flex flex-col items-center justify-center max-w-xl mx-auto border border-slate-200 dark:border-slate-800 my-8 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center mb-4 text-slate-500 dark:text-slate-400">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
