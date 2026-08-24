import React from "react";
import { AlertTriangle, RefreshCw, Terminal, ServerOff } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = "Connection Error",
  message = "Failed to load correlation data. The backend server or CognoDB instance might be unreachable.",
  onRetry,
}: ErrorStateProps) {
  const isBackendUnreachable =
    message.toLowerCase().includes("unable to reach") ||
    message.toLowerCase().includes("503") ||
    message.toLowerCase().includes("fetch");

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-8 rounded-2xl glass-panel border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/10 text-center flex flex-col items-center shadow-lg">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700/50 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
        {isBackendUnreachable ? (
          <ServerOff className="w-8 h-8" />
        ) : (
          <AlertTriangle className="w-8 h-8" />
        )}
      </div>

      <h3 className="text-xl font-bold text-rose-950 dark:text-rose-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-700 dark:text-slate-300 max-w-lg mb-6 leading-relaxed">
        {message}
      </p>

      {isBackendUnreachable && (
        <div className="w-full bg-white/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6 text-left font-mono text-xs text-slate-700 dark:text-slate-400">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-300 font-semibold mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Terminal className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span>Troubleshooting Checklist:</span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Ensure the backend is running: <span className="text-blue-600 dark:text-blue-300">uvicorn app.main:app --reload</span></li>
            <li>Check database connection in <span className="text-amber-700 dark:text-yellow-300">backend/.env</span> (COGNODB_URI)</li>
            <li>Run the seed pipeline: <span className="text-blue-600 dark:text-blue-300">python run_seed.py</span></li>
          </ul>
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-sm font-semibold transition-all duration-200 shadow-md flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
