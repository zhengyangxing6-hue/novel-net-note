import { notFound } from "next/navigation";
import Link from "next/link";
import path from "path";
import fs from "fs";
import { getNovelMeta } from "@/lib/novels";
import { listFiles, extractChapterId, parseMarkdownFile, decodeSlug } from "@/lib/content-parser";
import type { ChapterAnalysis } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

export default async function ChaptersPage({ params }: Props) {
  const { slug: encodedSlug } = await params;
  const slug = decodeSlug(encodedSlug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  const novelDir = path.join(CONTENT_ROOT, slug);

  // 从 original 和 analysis 目录收集所有章节
  const originalDir = path.join(novelDir, "original");
  const analysisDir = path.join(novelDir, "analysis");

  const originalFiles = await listFiles(originalDir, ".txt");
  const analysisFiles = await listFiles(analysisDir, ".md");

  const allIds = new Set([
    ...originalFiles.map(extractChapterId).filter((id): id is number => id !== null),
    ...analysisFiles.map(extractChapterId).filter((id): id is number => id !== null),
  ]);

  const chapters: { id: number; title: string; summary: string; hasAnalysis: boolean }[] = [];

  for (const id of [...allIds].sort((a, b) => a - b)) {
    const padded = String(id).padStart(3, "0");
    let title = "";
    let summary = "";
    let hasAnalysis = false;

    // 尝试从分析文件读取标题和摘要
    try {
      const { data } = parseMarkdownFile<ChapterAnalysis>(
        path.join(analysisDir, `chapter-${padded}.md`)
      );
      title = data.title || "";
      summary = data.plotSummary || "";
      hasAnalysis = true;
    } catch {
      // 没有分析文件，从原文首行提取标题
      try {
        const raw = fs.readFileSync(
          path.join(originalDir, `chapter-${padded}.txt`),
          "utf-8"
        );
        const firstLine = raw.split("\n")[0].trim();
        title = firstLine.replace(/^第[^\s章]+章\s*/, "");
        summary = raw.slice(firstLine.length, firstLine.length + 100).trim();
      } catch {
        title = `第 ${id} 章`;
      }
    }

    chapters.push({ id, title, summary, hasAnalysis });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">章节目录</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {chapters.length} 章 · {chapters.filter((c) => c.hasAnalysis).length} 章已分析
      </p>

      <div className="mt-6 space-y-1">
        {chapters.map((ch) => (
          <Link
            key={ch.id}
            href={`/novels/${slug}/read/${ch.id}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="w-12 shrink-0 text-right font-mono text-xs text-zinc-400">
              {ch.id}
            </span>
            <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
              {ch.title}
            </span>
            {ch.hasAnalysis && (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                已分析
              </span>
            )}
            <span className="shrink-0 text-xs text-zinc-400">
              {ch.summary.slice(0, 40)}{ch.summary.length > 40 ? "…" : ""}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
