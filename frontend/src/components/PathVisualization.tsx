"use client";

import React from "react";
import Link from "next/link";
import { ShortestPathResponse } from "@/types";
import { getSectorColor, getSectorBadgeClasses } from "@/lib/constants";
import { ArrowRight, Link2, ExternalLink } from "lucide-react";

interface PathVisualizationProps {
  pathData: ShortestPathResponse;
}

export default function PathVisualization({ pathData }: PathVisualizationProps) {
  const { path, edges, total_hops } = pathData;

  return (
    <div className="w-full rounded-2xl glass-panel p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Shortest Correlation Path
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Connected via <span className="text-blue-600 dark:text-blue-400 font-semibold">{total_hops} {total_hops === 1 ? "hop" : "hops"}</span> in the correlation network
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
          <span>Path Length:</span>
          <span className="text-blue-600 dark:text-blue-400 font-bold">{path.length} Stocks</span>
        </div>
      </div>

      {/* Linear Step-by-Step Path Flow */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 overflow-x-auto py-2">
        {path.map((stock, index) => {
          const isOrigin = index === 0;
          const isDestination = index === path.length - 1;
          const badgeClasses = getSectorBadgeClasses(stock.sector);
          const edge = edges[index];

          return (
            <React.Fragment key={stock.ticker}>
              {/* Stock Node Card */}
              <Link
                href={`/stocks/${stock.ticker}`}
                className={`group relative min-w-[170px] flex-1 rounded-2xl p-5 border transition-all duration-200 ${
                  isOrigin
                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-500/40 shadow-sm hover:border-blue-500"
                    : isDestination
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 shadow-sm hover:border-emerald-500"
                    : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700"
                }`}
              >
                {/* Node type tag */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    {isOrigin ? "Origin" : isDestination ? "Destination" : `Hop #${index}`}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {stock.ticker}
                </div>

                <div className="mt-2">
                  <span
                    className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClasses}`}
                  >
                    {stock.sector}
                  </span>
                </div>
              </Link>

              {/* Edge Link Connector */}
              {index < path.length - 1 && edge && (
                <div className="flex lg:flex-col items-center justify-center gap-1.5 px-2 py-3 lg:py-0">
                  <div className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-300">
                      r = {edge.strength >= 0 ? `+${edge.strength.toFixed(3)}` : edge.strength.toFixed(3)}
                    </span>
                  </div>
                  <div className="hidden lg:flex items-center text-slate-400 dark:text-slate-600">
                    <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="lg:hidden flex items-center text-slate-400 dark:text-slate-600">
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 rotate-90" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
