import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0d14",
        foreground: "#f3f4f6",
        surface: {
          DEFAULT: "#111827",
          hover: "#1f2937",
          border: "#374151",
        },
        sector: {
          tech: "#3B82F6",
          finance: "#10B981",
          energy: "#F59E0B",
          healthcare: "#EF4444",
          consumer: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
