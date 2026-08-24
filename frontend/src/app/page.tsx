"use client";

import { useEffect, useState, useMemo } from "react";
import { Stock } from "@/types";
import { fetchStocks } from "@/lib/api";
import { ALL_SECTORS } from "@/lib/constants";
import StockCard from "@/components/StockCard";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { Search, Filter, Sparkles, TrendingUp, Layers, GitBranch } from "lucide-react";

export default function HomePage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<string>("All");

  const loadStocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStocks();
      setStocks(data);
    } catch (err: any) {
      setError(err.message || "Failed to load stocks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, []);

  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const matchesSearch =
        stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.sector.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector =
        selectedSector === "All" || stock.sector === selectedSector;
      return matchesSearch && matchesSector;
    });
  }, [stocks, searchQuery, selectedSector]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { All: stocks.length };
    stocks.forEach((s) => {
      counts[s.sector] = (counts[s.sector] || 0) + 1;
    });
    return counts;
  }, [stocks]);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative rounded-3xl glass-panel p-8 sm:p-10 border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-sm dark:shadow-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100/50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-[#0a0d14]">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Graph-Native Financial Intelligence
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Explore Stock Market <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
              Correlation Networks
            </span>
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
            CorrelateX models real equity price movements as a high-performance graph in CognoDB.
            Discover hidden systemic linkages, cross-sector ripple paths, and triangle cliques
            that traditional relational tables cannot easily traverse.
          </p>
        </div>

        {/* Quick Stats Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-white">{stocks.length || "20"}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Tracked Equities</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-white">5 Sectors</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Equities Taxonomy</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-white">Pearson r</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Daily Return Metric</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls: Search and Sector Filter Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by ticker or sector (e.g. AAPL, Tech)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sector Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1 hidden sm:block flex-shrink-0" />
          {ALL_SECTORS.map((sector) => {
            const isSelected = selectedSector === sector;
            const count = sectorCounts[sector];
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <span>{sector}</span>
                {count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-blue-700 text-blue-100" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area: Loading, Error, Empty, or Stock Grid */}
      {loading ? (
        <SkeletonLoader variant="cards" count={12} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Stock Network"
          message={error}
          onRetry={loadStocks}
        />
      ) : filteredStocks.length === 0 ? (
        <EmptyState
          title="No Stocks Found"
          message={`No equities matched your search "${searchQuery}" in ${selectedSector} sector.`}
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery("");
            setSelectedSector("All");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStocks.map((stock) => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
}
