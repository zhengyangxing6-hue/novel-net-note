import { notFound } from "next/navigation";
import path from "path";
import fs from "fs";
import {
  parseMarkdownFileAsync,
  formatChapterFilename,
  listFiles,
  extractChapterId,
  decodeSlug,
} from "@/lib/content-parser";
import { getNovelMeta } from "@/lib/novels";
import type { ChapterAnalysis, ChapterNote } from "@/lib/types";
import { ReaderClient } from "@/components/novel/ReaderClient";

export const dynamic = "force-dynamic";

interface ReaderPageProps {
  params: Promise<{ slug: string; chapterId: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { chapterId: chapterIdStr, slug: encodedSlug } = await params;
  const slug = decodeSlug(encodedSlug);
  const chapterId = parseInt(chapterIdStr, 10);

  if (isNaN(chapterId)) notFound();

  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  const novelDir = path.join(CONTENT_ROOT, slug);

  // 读取原文
  const originalFile = path.join(novelDir, "original", formatChapterFilename(chapterId, "txt"));
  let originalText = "";
  try {
    originalText = fs.readFileSync(originalFile, "utf-8");
  } catch {
    originalText = "";
  }

  // 读取分析
  const analysisFile = path.join(novelDir, "analysis", formatChapterFilename(chapterId, "md"));
  let analysisData: ChapterAnalysis | null = null;
  let analysisContent = "";
  try {
    const { data, content } = await parseMarkdownFileAsync<ChapterAnalysis>(analysisFile);
    analysisData = data;
    analysisContent = content;
  } catch {
    // 分析文件不存在
  }

  // 读取笔记
  const notesFile = path.join(novelDir, "notes", formatChapterFilename(chapterId, "md"));
  let notesData: ChapterNote | null = null;
  let notesContent = "";
  try {
    const { data, content } = await parseMarkdownFileAsync<ChapterNote>(notesFile);
    notesData = data;
    notesContent = content;
  } catch {
    notesContent = "";
  }

  // 获取所有章节目录（用于导航），优先从 original 获取（总是存在），再合并 analysis
  const originalDir = path.join(novelDir, "original");
  const analysisDir = path.join(novelDir, "analysis");
  const originalFiles = await listFiles(originalDir, ".txt");
  const analysisFiles = await listFiles(analysisDir, ".md");
  const allChapterIds = new Set([
    ...originalFiles.map(extractChapterId).filter((id): id is number => id !== null),
    ...analysisFiles.map(extractChapterId).filter((id): id is number => id !== null),
  ]);
  const allChapters = [...allChapterIds].sort((a, b) => a - b);

  const currentIdx = allChapters.indexOf(chapterId);
  const prevChapter = currentIdx > 0 ? allChapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < allChapters.length - 1 ? allChapters[currentIdx + 1] : null;

  return (
    <ReaderClient
      slug={slug}
      chapterId={chapterId}
      originalText={originalText}
      analysisData={analysisData}
      analysisContent={analysisContent}
      notesData={notesData}
      notesContent={notesContent}
      prevChapter={prevChapter}
      nextChapter={nextChapter}
      totalChapters={allChapters.length}
    />
  );
}
