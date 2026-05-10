import { notFound } from "next/navigation";
import Link from "next/link";
import path from "path";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFileAsync, listFiles, decodeSlug } from "@/lib/content-parser";
import type { NovelEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

const typeColors: Record<string, string> = {
  "战斗": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "转折": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "揭示": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "日常": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function EventsPage({ params }: Props) {
  const slug = decodeSlug((await params).slug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  const eventsDir = path.join(CONTENT_ROOT, slug, "events");
  const files = await listFiles(eventsDir, ".md");

  const events: (NovelEvent & { slug: string })[] = [];
  for (const file of files) {
    try {
      const { data } = await parseMarkdownFileAsync<NovelEvent>(
        path.join(eventsDir, file)
      );
      events.push({ ...data, slug: path.basename(file, ".md") });
    } catch {
      // 跳过
    }
  }

  // 按卷分组排序
  events.sort((a, b) => {
    if (a.volume !== b.volume) return a.volume - b.volume;
    const aStart = parseInt(a.chapters.split("-")[0], 10);
    const bStart = parseInt(b.chapters.split("-")[0], 10);
    return aStart - bStart;
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">事件时间线</h1>
      <p className="mt-1 text-sm text-zinc-500">{events.length} 个重大事件</p>

      {events.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">暂无事件记录</p>
        </div>
      ) : (
        <div className="mt-6">
          {/* 时间线 */}
          <div className="relative border-l-2 border-zinc-200 pl-6 dark:border-zinc-700">
            {events.map((event) => (
              <div key={event.slug} className="relative mb-6">
                {/* 时间线圆点 */}
                <div className="absolute -left-[calc(1.5rem+0.25rem)] top-1 h-3 w-3 rounded-full border-2 border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-900" />

                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{event.name}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{event.summary}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {event.type && (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${typeColors[event.type] || ''}`}>
                          {event.type}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">
                        第 {event.chapters} 章 · 第 {event.volume} 卷
                      </span>
                    </div>
                  </div>
                  {event.characters && event.characters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {event.characters.map((char) => (
                        <span
                          key={char}
                          className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
