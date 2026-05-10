import { notFound } from "next/navigation";
import path from "path";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFile, decodeSlug } from "@/lib/content-parser";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { StructureAnalysis } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

export default async function StructurePage({ params }: Props) {
  const slug = decodeSlug((await params).slug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  let data: StructureAnalysis | null = null;
  let content = "";

  try {
    const parsed = parseMarkdownFile<StructureAnalysis>(
      path.join(CONTENT_ROOT, slug, "structure.md")
    );
    data = parsed.data;
    content = parsed.content;
  } catch {
    // 文件不存在
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">结构分析</h1>

      {data && (
        <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
          <span>{data.totalArcs} 个篇章</span>
          <span>·</span>
          <span>{data.totalVolumes} 卷</span>
        </div>
      )}

      {/* 篇章时间线 */}
      {data?.arcs && data.arcs.length > 0 && (
        <div className="mt-6 space-y-3">
          {data.arcs.map((arc, i) => {
            const [startStr, endStr] = arc.chapters.includes("-")
              ? arc.chapters.split("-")
              : [arc.chapters, arc.chapters];
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : start;
            const totalChapters = novel.chapterCount || end;

            return (
              <div
                key={arc.name}
                className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 dark:bg-zinc-800">
                        {i + 1}
                      </span>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{arc.name}</h3>
                      {arc.turningPoint && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          转折点
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{arc.summary}</p>
                    {arc.turningPoint && (
                      <p className="mt-1 text-xs text-zinc-400">关键转折：{arc.turningPoint}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-zinc-400">
                    {arc.chapters} 章
                  </span>
                </div>
                {/* 进度条 */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${((end - start + 1) / Math.max(totalChapters, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {content && (
        <div className="mt-8">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {!data && !content && (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">暂无结构分析</p>
        </div>
      )}
    </div>
  );
}
