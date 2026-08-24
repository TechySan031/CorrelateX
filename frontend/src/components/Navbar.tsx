"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Network, GitFork, Boxes, Activity, Sparkles } from "lucide-react";
import { fetchHealth } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        if (data.database === "connected") {
          setDbStatus("connected");
        } else {
          setDbStatus("disconnected");
        }
      })
      .catch(() => {
        setDbStatus("disconnected");
      });
  }, []);

  const navLinks = [
    { href: "/", label: "Network Explorer", icon: Network },
    { href: "/path-finder", label: "Path Finder", icon: GitFork },
    { href: "/clusters", label: "Clusters & Cliques", icon: Boxes },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-[#0a0d14]/80 border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-blue-600 dark:from-white dark:via-slate-200 dark:to-blue-400 bg-clip-text text-transparent">
                Correlate<span className="text-blue-600 dark:text-blue-500">X</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Graph v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Stock Market Correlation Graph</p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/" || pathname.startsWith("/stocks/")
                : pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 shadow-sm shadow-blue-500/5"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions: DB Health Status Indicator + Theme Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                dbStatus === "connected"
                  ? "bg-emerald-500 dark:bg-emerald-400 shadow-emerald-400/50 shadow-sm"
                  : dbStatus === "disconnected"
                  ? "bg-rose-500 shadow-rose-500/50 shadow-sm"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px] hidden md:inline">
              {dbStatus === "connected"
                ? "CognoDB Live"
                : dbStatus === "disconnected"
                ? "DB Offline"
                : "Checking DB..."}
            </span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
