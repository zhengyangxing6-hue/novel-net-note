"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NovelMeta } from "@/lib/types";
import { BookOpen } from "lucide-react";

const statusMap: Record<string, { label: string; color: string }> = {
  ongoing: { label: "连载中", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  completed: { label: "已完结", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  hiatus: { label: "断更", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function NovelCard({ novel }: { novel: NovelMeta }) {
  const status = statusMap[novel.status] ?? statusMap.ongoing;
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`reading-progress-${novel.slug}`);
    if (saved) setProgress(parseInt(saved, 10));
  }, [novel.slug]);

  return (
    <Link
      href={`/novels/${novel.slug}`}
      className="block rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{novel.title}</h3>
      <p className="mt-1 text-sm text-zinc-500">{novel.author}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
        {novel.genre.slice(0, 3).map((g) => (
          <span key={g} className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {g}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
        <span>{novel.chapterCount} 章</span>
        <span>{(novel.wordCount / 10000).toFixed(0)} 万字</span>
        {progress && (
          <span className="flex items-center gap-1 text-blue-500">
            <BookOpen className="h-3 w-3" />
            读到第 {progress} 章
          </span>
        )}
      </div>
      {progress && (
        <div className="mt-2 h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-blue-400" style={{ width: `${(progress / (novel.chapterCount || 1)) * 100}%` }} />
        </div>
      )}
    </Link>
  );
}
