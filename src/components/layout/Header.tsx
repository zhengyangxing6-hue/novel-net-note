import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-100/80 h-16 flex items-center justify-between px-8 transition-all">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-slate-700 tracking-wide">阅读空间</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
