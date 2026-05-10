import path from 'path';
import { listDirs, parseMarkdownFile } from './content-parser';
import type { NovelMeta } from './types';

const CONTENT_ROOT = path.resolve(process.cwd(), 'content/novels');

export function getContentRoot(): string {
  return CONTENT_ROOT;
}

/**
 * 获取所有已导入的小说列表。
 */
export async function getAllNovels(): Promise<NovelMeta[]> {
  const slugs = await listDirs(CONTENT_ROOT);
  const novels: NovelMeta[] = [];

  for (const slug of slugs) {
    if (slug === '_templates' || slug.startsWith('.')) continue;
    try {
      const { data } = parseMarkdownFile<NovelMeta>(
        path.join(CONTENT_ROOT, slug, 'overview.md')
      );
      novels.push({ ...data, slug });
    } catch {
      // 没有 overview.md，跳过
    }
  }

  return novels.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * 获取单部小说的元数据。
 */
export function getNovelMeta(slug: string): NovelMeta | null {
  try {
    const { data } = parseMarkdownFile<NovelMeta>(
      path.join(CONTENT_ROOT, slug, 'overview.md')
    );
    return { ...data, slug };
  } catch {
    return null;
  }
}

/**
 * 获取小说目录（所有章节文件列表）。
 */
export async function getNovelChapters(slug: string): Promise<number[]> {
  const { listFiles, extractChapterId } = await import('./content-parser');
  const analysisDir = path.join(CONTENT_ROOT, slug, 'analysis');
  const files = await listFiles(analysisDir, '.md');

  return files
    .map(extractChapterId)
    .filter((id): id is number => id !== null)
    .sort((a, b) => a - b);
}

/**
 * 获取小说原文目录（所有 txt 文件列表）。
 */
export async function getNovelOriginalChapters(slug: string): Promise<number[]> {
  const { listFiles, extractChapterId } = await import('./content-parser');
  const originalDir = path.join(CONTENT_ROOT, slug, 'original');
  const files = await listFiles(originalDir, '.txt');

  return files
    .map(extractChapterId)
    .filter((id): id is number => id !== null)
    .sort((a, b) => a - b);
}
