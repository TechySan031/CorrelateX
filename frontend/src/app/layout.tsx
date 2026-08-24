import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CorrelateX — Stock Correlation Network",
  description:
    "Explore stock market correlation networks, hidden clusters, and shortest paths powered by CognoDB graph analytics and Groq AI narration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('correlatex-theme');
                if (saved === 'light' || (!saved && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#0a0d14] text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-300">
        {/* Ambient Backdrop Gradients */}
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        
        <Navbar />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        
        <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500 dark:text-slate-500 bg-white/50 dark:bg-transparent">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>CorrelateX &copy; {new Date().getFullYear()} — Graph-Native Financial Correlation Engine</p>
            <p className="flex items-center gap-3">
              <span>Powered by <span className="text-slate-700 dark:text-slate-300 font-medium">CognoDB</span></span>
              <span>•</span>
              <span>FastAPI &amp; Next.js</span>
              <span>•</span>
              <span>Groq LLaMA 3.3</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
