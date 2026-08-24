"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { fetchAiSummary } from "@/lib/api";

interface AiSummaryPanelProps {
  ticker: string;
}

export default function AiSummaryPanel({ ticker }: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAiSummary(ticker);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err.message || "Failed to load AI summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [ticker]);

  return (
    <div className="relative rounded-2xl glass-panel p-6 border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-white via-indigo-50/30 to-white dark:from-slate-900/90 dark:via-indigo-950/15 dark:to-slate-900/90 overflow-hidden shadow-md">
      {/* Decorative Top Glowing Border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              AI Market Intelligence
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                LLaMA 3.3 70B
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Graph fact synthesis for {ticker}</p>
          </div>
        </div>

        <button
          onClick={loadSummary}
          disabled={loading}
          title="Regenerate summary"
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary Content Body */}
      {loading ? (
        <div className="space-y-2 py-2 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/6"></div>
        </div>
      ) : error ? (
        <div className="py-2 text-xs text-amber-600 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
          {summary}
        </p>
      )}

      {/* Mandatory Disclaimer Badge */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400/90 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          AI-generated — verify before use.
        </span>
        <span className="text-[10px] text-slate-400">Deterministic graph facts injected</span>
      </div>
    </div>
  );
}
