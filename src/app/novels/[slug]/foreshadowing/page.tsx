import { notFound } from "next/navigation";
import path from "path";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFile, decodeSlug } from "@/lib/content-parser";
import type { ForeshadowingData } from "@/lib/types";
import { Eye, CheckCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

const importanceColors: Record<string, string> = {
  "关键": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "重要": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "次要": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const categoryColors: Record<string, string> = {
  "叙事": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "人物": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "世界观": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "主题": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default async function ForeshadowingPage({ params }: Props) {
  const slug = decodeSlug((await params).slug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  let threads: ForeshadowingData['threads'] = [];
  try {
    const { data } = parseMarkdownFile<ForeshadowingData>(
      path.join(CONTENT_ROOT, slug, "foreshadowing.md")
    );
    threads = data.threads || [];
  } catch {
    // 文件不存在
  }

  const resolved = threads.filter((t) => t.status === "已回收");
  const active = threads.filter((t) => t.status !== "已回收");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">伏笔追踪</h1>
      <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
        <span>共 {threads.length} 条伏笔</span>
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          已回收 {resolved.length}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          进行中 {active.length}
        </span>
      </div>

      {threads.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">暂无伏笔记录</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-400">{thread.id}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {thread.description}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${importanceColors[thread.importance] || ''}`}>
                      {thread.importance}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${categoryColors[thread.category] || ''}`}>
                      {thread.category}
                    </span>
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {thread.technique}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      thread.status === "已回收"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : thread.status === "进行中"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {thread.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">铺设章节：</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {thread.setupChapters?.join(", ")}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">回收章节：</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {thread.payoffChapters?.length > 0 ? thread.payoffChapters.join(", ") : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
