"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NetworkResponse, Correlation } from "@/types";
import { fetchNetwork, fetchCorrelations } from "@/lib/api";
import { getSectorBadgeClasses, getSectorColor } from "@/lib/constants";
import NetworkGraph from "@/components/NetworkGraph";
import AiSummaryPanel from "@/components/AiSummaryPanel";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import {
  ArrowLeft,
  TrendingUp,
  Layers,
  GitBranch,
} from "lucide-react";

export default function StockDetailPage() {
  const params = useParams();
  const rawTicker = (params?.ticker as string) || "";
  const ticker = rawTicker.toUpperCase();

  // Filter controls state
  const [hops, setHops] = useState<number>(2);
  const [minStrength, setMinStrength] = useState<number>(0.5);

  // Debounced values for querying API
  const [debouncedHops, setDebouncedHops] = useState<number>(2);
  const [debouncedStrength, setDebouncedStrength] = useState<number>(0.5);

  // Network & Correlation data
  const [networkData, setNetworkData] = useState<NetworkResponse | null>(null);
  const [directCorrs, setDirectCorrs] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce slider updates (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHops(hops);
      setDebouncedStrength(minStrength);
    }, 300);
    return () => clearTimeout(timer);
  }, [hops, minStrength]);

  const loadData = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const [netRes, corrRes] = await Promise.all([
        fetchNetwork(ticker, debouncedHops, debouncedStrength),
        fetchCorrelations(ticker, debouncedStrength),
      ]);
      setNetworkData(netRes);
      setDirectCorrs(corrRes);
    } catch (err: any) {
      setError(err.message || `Failed to load correlation data for ${ticker}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ticker, debouncedHops, debouncedStrength]);

  const sector = networkData?.center?.sector || "Unknown";
  const badgeClasses = getSectorBadgeClasses(sector);
  const sectorColor = getSectorColor(sector);

  return (
    <div className="space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Stocks</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono">Route: /stocks/{ticker}</span>
        </div>
      </div>

      {/* Stock Hero Header */}
      <div className="relative rounded-3xl glass-panel p-6 sm:p-8 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden shadow-sm">
        {/* Sector glowing ambient corner */}
        <div
          className="absolute -top-16 -right-16 w-60 h-60 rounded-full opacity-15 dark:opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundColor: sectorColor }}
        />

        <div className="flex items-center gap-5 z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md"
            style={{ backgroundColor: sectorColor }}
          >
            {ticker.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {ticker}
              </h1>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badgeClasses}`}>
                {sector}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-Hop Correlation Topology &amp; Systemic Linkages
            </p>
          </div>
        </div>

        {/* Quick Graph Metrics */}
        {networkData && (
          <div className="flex items-center gap-6 z-10 text-xs">
            <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-slate-500 dark:text-slate-400">Network Nodes</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {(networkData.nodes?.length || 0) + 1}
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-slate-500 dark:text-slate-400">Correlation Edges</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {networkData.edges?.length || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-center shadow-sm">
        {/* Hop Depth Slider (1 - 4) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Multi-Hop Graph Depth:
            </label>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
              {hops} {hops === 1 ? "Hop" : "Hops"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={hops}
            onChange={(e) => setHops(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>1 (Direct)</span>
            <span>2 (Neighbors)</span>
            <span>3 (Extended)</span>
            <span>4 (Deep)</span>
          </div>
        </div>

        {/* Minimum Correlation Strength Slider (0.5 - 1.0) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Min. Correlation Strength:
            </label>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
              |r| &ge; {minStrength.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.05}
            value={minStrength}
            onChange={(e) => setMinStrength(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>0.50 (Moderate)</span>
            <span>0.70 (Strong)</span>
            <span>0.85 (High)</span>
            <span>0.95 (Extreme)</span>
          </div>
        </div>
      </div>

      {/* Main Detail Content */}
      {loading ? (
        <SkeletonLoader variant="graph" />
      ) : error ? (
        <ErrorState
          title={`Unable to load graph for ${ticker}`}
          message={error}
          onRetry={loadData}
        />
      ) : !networkData || (networkData.nodes.length === 0 && directCorrs.length === 0) ? (
        <EmptyState
          title="No Correlations Found"
          message={`No correlation edges exist for ${ticker} at threshold |r| ≥ ${minStrength.toFixed(
            2
          )}. Try lowering the strength threshold.`}
          actionLabel="Lower Threshold to 0.50"
          onAction={() => setMinStrength(0.5)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2D Force-Directed Graph */}
          <div className="lg:col-span-2 space-y-4">
            <NetworkGraph data={networkData} centerTicker={ticker} />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              💡 Drag nodes to rearrange • Click any node to explore its network • Scroll to zoom
            </p>
          </div>

          {/* Right Sidebar: AI Summary & Direct Correlations */}
          <div className="space-y-6">
            <AiSummaryPanel ticker={ticker} />

            {/* Direct Correlations Breakdown */}
            <div className="rounded-2xl glass-panel p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Direct 1-Hop Pairs
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {directCorrs.length} found
                </span>
              </div>

              {directCorrs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No direct correlations above {minStrength.toFixed(2)}.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {directCorrs.map((corr) => {
                    const corrBadge = getSectorBadgeClasses(corr.sector);
                    return (
                      <Link
                        key={corr.ticker}
                        href={`/stocks/${corr.ticker}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {corr.ticker}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${corrBadge}`}>
                            {corr.sector}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +{corr.strength.toFixed(3)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
