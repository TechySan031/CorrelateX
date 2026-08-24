"use client";

import { useEffect, useState } from "react";
import { Stock, ShortestPathResponse } from "@/types";
import { fetchStocks, fetchShortestPath } from "@/lib/api";
import PathVisualization from "@/components/PathVisualization";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { GitFork, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

export default function PathFinderPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState<boolean>(true);

  const [fromTicker, setFromTicker] = useState<string>("");
  const [toTicker, setToTicker] = useState<string>("");

  const [pathData, setPathData] = useState<ShortestPathResponse | null>(null);
  const [searching, setSearching] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available stocks on mount
  useEffect(() => {
    fetchStocks()
      .then((data) => {
        setStocks(data);
        if (data.length >= 2) {
          setFromTicker(data[0].ticker);
          const diffSectorStock = data.find((s) => s.sector !== data[0].sector);
          setToTicker(diffSectorStock ? diffSectorStock.ticker : data[1].ticker);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load stock list.");
      })
      .finally(() => {
        setLoadingStocks(false);
      });
  }, []);

  const handleFindPath = async () => {
    if (!fromTicker || !toTicker) return;
    if (fromTicker === toTicker) {
      setError("Please select two distinct stocks to find a correlation path.");
      return;
    }

    setSearching(true);
    setError(null);
    setSearched(true);

    try {
      const result = await fetchShortestPath(fromTicker, toTicker);
      setPathData(result);
    } catch (err: any) {
      if (err.message.includes("404") || err.message.includes("No correlation path")) {
        setPathData(null);
      } else {
        setError(err.message || "Failed to find correlation path.");
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl glass-panel p-8 sm:p-10 border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50 to-slate-100/50 dark:from-slate-900/60 dark:to-[#0a0d14] shadow-sm">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <GitFork className="w-3.5 h-3.5" />
            Graph Traversal Engine
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Shortest Correlation <span className="text-blue-600 dark:text-blue-400">Path Finder</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Uncover the shortest transmission chain of price movement between two seemingly unrelated
            equities. Powered by openCypher&apos;s native <code className="text-blue-600 dark:text-blue-300 font-mono text-xs">shortestPath()</code> algorithm.
          </p>
        </div>
      </div>

      {/* Interactive Selection Form */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Origin Stock Dropdown */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Origin Stock (From)
            </label>
            <select
              value={fromTicker}
              disabled={loadingStocks || searching}
              onChange={(e) => {
                setFromTicker(e.target.value);
                setSearched(false);
              }}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              {stocks.map((stock) => (
                <option key={stock.ticker} value={stock.ticker} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {stock.ticker} — {stock.sector}
                </option>
              ))}
            </select>
          </div>

          {/* Center Connector Indicator */}
          <div className="hidden md:flex flex-col items-center justify-center pt-5 text-slate-400 dark:text-slate-500">
            <ArrowRight className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>

          {/* Destination Stock Dropdown */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Destination Stock (To)
            </label>
            <select
              value={toTicker}
              disabled={loadingStocks || searching}
              onChange={(e) => {
                setToTicker(e.target.value);
                setSearched(false);
              }}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              {stocks.map((stock) => (
                <option key={stock.ticker} value={stock.ticker} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {stock.ticker} — {stock.sector}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Find Path Button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span>Computes minimum hops across all Pearson correlation edges (|r| &ge; 0.50)</span>
          </div>

          <button
            onClick={handleFindPath}
            disabled={searching || loadingStocks || !fromTicker || !toTicker || fromTicker === toTicker}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {searching ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                Traversing Graph...
              </>
            ) : (
              <>
                <GitFork className="w-4 h-4" />
                Find Shortest Path
              </>
            )}
          </button>
        </div>
      </div>

      {/* Path Results Area */}
      {searching ? (
        <SkeletonLoader variant="path" />
      ) : error ? (
        <ErrorState
          title="Path Traversal Failed"
          message={error}
          onRetry={handleFindPath}
        />
      ) : searched && !pathData ? (
        <EmptyState
          title="No Correlation Path Disconnected"
          message={`No continuous path of correlation (|r| ≥ 0.5) exists between ${fromTicker} and ${toTicker} in the current dataset. These stocks belong to isolated sub-graphs.`}
          icon={AlertCircle}
        />
      ) : pathData ? (
        <PathVisualization pathData={pathData} />
      ) : (
        <div className="py-12 px-6 rounded-2xl glass-panel text-center text-slate-500 dark:text-slate-400 text-sm border border-slate-200 dark:border-slate-800 shadow-sm">
          <GitFork className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3 opacity-60" />
          <p className="max-w-md mx-auto">
            Select two stocks above and click <strong className="text-slate-900 dark:text-white">&quot;Find Shortest Path&quot;</strong> to trace the multi-hop transmission path.
          </p>
        </div>
      )}
    </div>
  );
}
