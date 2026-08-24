"use client";

import Link from "next/link";
import { ArrowUpRight, Network } from "lucide-react";
import { Stock } from "@/types";
import { getSectorColor, getSectorBadgeClasses } from "@/lib/constants";

interface StockCardProps {
  stock: Stock;
}

export default function StockCard({ stock }: StockCardProps) {
  const sectorColor = getSectorColor(stock.sector);
  const badgeClasses = getSectorBadgeClasses(stock.sector);

  return (
    <Link
      href={`/stocks/${stock.ticker}`}
      className="group relative rounded-2xl glass-panel-interactive p-5 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Sector-themed subtle top border accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-85 group-hover:h-1.5 transition-all duration-300"
        style={{ backgroundColor: sectorColor }}
      />

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {stock.ticker}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Equities</p>
        </div>

        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeClasses}`}
        >
          {stock.sector}
        </span>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors">
          <Network className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          Explore Graph
        </span>
        <span className="text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
          View Details &rarr;
        </span>
      </div>
    </Link>
  );
}
