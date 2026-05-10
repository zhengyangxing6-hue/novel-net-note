import { notFound } from "next/navigation";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFile, decodeSlug } from "@/lib/content-parser";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { NovelMeta } from "@/lib/types";
import path from "path";

interface NovelPageProps {
  params: Promise<{ slug: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

const statusMap: Record<string, string> = {
  ongoing: "连载中",
  completed: "已完结",
  hiatus: "断更",
  cancelled: "已取消",
};

export default async function NovelPage({ params }: NovelPageProps) {
  const slug = decodeSlug((await params).slug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  // 读取 overview.md 正文
  let content = "";
  try {
    const parsed = parseMarkdownFile<NovelMeta>(
      path.join(CONTENT_ROOT, slug, "overview.md")
    );
    content = parsed.content;
  } catch {
    content = "暂无内容概括。";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {novel.title}
        </h1>
        <p className="mt-1 text-zinc-500">{novel.author}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {statusMap[novel.status] ?? novel.status}
          </span>
          {novel.genre.map((g) => (
            <span
              key={g}
              className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              {g}
            </span>
          ))}
          <span className="text-sm text-zinc-400">
            {novel.chapterCount} 章 · {(novel.wordCount / 10000).toFixed(0)} 万字
          </span>
          {novel.startYear && (
            <span className="text-sm text-zinc-400">
              {novel.startYear}
              {novel.endYear ? ` - ${novel.endYear}` : " - 至今"}
            </span>
          )}
        </div>
      </div>

      <MarkdownRenderer content={content} />
    </div>
  );
}
