"use client";

import { useEffect, useState } from "react";
import { ClusterItem } from "@/types";
import { fetchClusters } from "@/lib/api";
import ClusterCard from "@/components/ClusterCard";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { Boxes, ShieldAlert, TrendingUp } from "lucide-react";

export default function ClustersPage() {
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [minStrength, setMinStrength] = useState<number>(0.5);
  const [debouncedStrength, setDebouncedStrength] = useState<number>(0.5);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce slider updates (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStrength(minStrength);
    }, 300);
    return () => clearTimeout(timer);
  }, [minStrength]);

  const loadClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClusters(debouncedStrength);
      setClusters(data);
    } catch (err: any) {
      setError(err.message || "Failed to load correlation clusters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClusters();
  }, [debouncedStrength]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel p-8 sm:p-10 border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50 to-slate-100/50 dark:from-slate-900/60 dark:to-[#0a0d14] shadow-sm">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
            <Boxes className="w-3.5 h-3.5" />
            Clique &amp; Concentration Risk Analytics
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Triangle Correlation <span className="text-purple-600 dark:text-purple-400">Clusters</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Identifies 3-node complete subgraphs (triangles) where all three stocks are mutually
            correlated above the threshold. Triangle cliques uncover hidden portfolio concentration
            risks where assets move synchronously regardless of apparent sector diversification.
          </p>
        </div>
      </div>

      {/* Threshold Filter Control */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="w-full sm:max-w-md space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Minimum Clique Edge Strength:
            </label>
            <span className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">
              |r| &ge; {minStrength.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={0.9}
            step={0.05}
            value={minStrength}
            onChange={(e) => setMinStrength(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>0.50 (Loose)</span>
            <span>0.65 (Moderate)</span>
            <span>0.80 (Tight)</span>
            <span>0.90 (Extreme)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          <span>
            {clusters.length} triangle {clusters.length === 1 ? "cluster" : "clusters"} detected at r &ge; {debouncedStrength.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Cluster Grid / Loading / Empty / Error */}
      {loading ? (
        <SkeletonLoader variant="clusters" count={6} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Correlation Clusters"
          message={error}
          onRetry={loadClusters}
        />
      ) : clusters.length === 0 ? (
        <EmptyState
          title="No Triangle Cliques Found"
          message={`No 3-way mutual correlation triangles exist where all edges have strength |r| ≥ ${debouncedStrength.toFixed(
            2
          )}. Try lowering the strength threshold.`}
          actionLabel="Set Threshold to 0.50"
          onAction={() => setMinStrength(0.5)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map((cluster, idx) => (
            <ClusterCard key={idx} cluster={cluster} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
