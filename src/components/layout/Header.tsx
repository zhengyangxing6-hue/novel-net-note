import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex h-12 items-center gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-sm">Novel Analysis Lab</span>
        </Link>
        <nav className="flex items-center gap-4 ml-8 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            小说库
          </Link>
        </nav>
        <div className="flex-1" />
      </div>
    </header>
  );
}
