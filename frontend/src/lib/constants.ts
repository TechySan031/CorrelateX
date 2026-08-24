import { SectorName } from "@/types";

export const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3B82F6",
  Finance: "#10B981",
  Energy: "#F59E0B",
  Healthcare: "#EF4444",
  Consumer: "#8B5CF6",
  Unknown: "#6B7280",
};

export const SECTOR_BG_COLORS: Record<string, string> = {
  Technology: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  Finance: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  Energy: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  Healthcare: "bg-red-500/10 border-red-500/30 text-red-400",
  Consumer: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  Unknown: "bg-gray-500/10 border-gray-500/30 text-gray-400",
};

export const ALL_SECTORS: string[] = [
  "All",
  "Technology",
  "Finance",
  "Energy",
  "Healthcare",
  "Consumer",
];

export const getSectorColor = (sector?: string): string => {
  if (!sector) return SECTOR_COLORS.Unknown;
  return SECTOR_COLORS[sector] || SECTOR_COLORS.Unknown;
};

export const getSectorBadgeClasses = (sector?: string): string => {
  if (!sector) return SECTOR_BG_COLORS.Unknown;
  return SECTOR_BG_COLORS[sector] || SECTOR_BG_COLORS.Unknown;
};
