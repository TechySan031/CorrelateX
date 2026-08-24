"use client";

import Link from "next/link";
import { ClusterItem } from "@/types";
import { getSectorBadgeClasses, getSectorColor } from "@/lib/constants";
import { Triangle, ArrowRightLeft } from "lucide-react";

interface ClusterCardProps {
  cluster: ClusterItem;
  index: number;
}

export default function ClusterCard({ cluster, index }: ClusterCardProps) {
  const { stocks, correlations, avg_strength } = cluster;

  return (
    <div className="relative rounded-2xl glass-panel-interactive p-6 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Cluster Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Triangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Clique Cluster #{index + 1}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">3-Node Triangle Clique</p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold">
          Avg r: {avg_strength.toFixed(3)}
        </div>
      </div>

      {/* 3 Stocks in Clique */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {stocks.map((stock) => {
          const badgeClass = getSectorBadgeClasses(stock.sector);
          return (
            <Link
              key={stock.ticker}
              href={`/stocks/${stock.ticker}`}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 text-center hover:border-blue-400 dark:hover:border-slate-600 transition-colors group"
            >
              <div className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {stock.ticker}
              </div>
              <div className="mt-1">
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                  {stock.sector}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pairwise Correlation Edges Breakdown */}
      <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Pairwise Linkages</span>
          <span className="font-mono text-slate-400 dark:text-slate-500">Pearson r</span>
        </div>

        {correlations.map((corr, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/50"
          >
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
              <span>{corr.pair[0]}</span>
              <ArrowRightLeft className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span>{corr.pair[1]}</span>
            </div>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              +{corr.strength.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
