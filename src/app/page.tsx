"use client";

import { useState, useEffect } from "react";
import { getAllNovels } from "@/lib/novels";
import { NovelCard } from "@/components/novel/NovelCard";
import { ImportDialog } from "@/components/novel/ImportDialog";
import { Upload } from "lucide-react";
import type { NovelMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const [novels, setNovels] = useState<NovelMeta[]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetch("/api/novels")
      .then((r) => r.json())
      .then((data) => setNovels(data.novels || []))
      .catch(() => setNovels([]));
  }, []);

  return (
    <div className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">小说分析库</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              拆解分析经典网络小说，学习大纲节奏与写作技法
            </p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            <Upload className="h-4 w-4" />
            导入书籍
          </button>
        </div>

        {novels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-16 text-center dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400">还没有导入任何小说</p>
            <p className="mt-1 text-sm text-zinc-400">
              点击"导入书籍"上传 txt 或 md 文件，自动拆分章节
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {novels.map((novel) => (
              <NovelCard key={novel.slug} novel={novel} />
            ))}
          </div>
        )}

        <ImportDialog open={showImport} onClose={() => { setShowImport(false); window.location.reload(); }} />
      </div>
    </div>
  );
}
