import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

/**
 * 读取并解析一个 Markdown 文件，返回 frontmatter 数据和正文。
 */
export function parseMarkdownFile<T = Record<string, unknown>>(filePath: string): {
  data: T;
  content: string;
} {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseMarkdownString<T>(raw);
}

/**
 * 解析 Markdown 字符串，返回 frontmatter 数据和正文。
 */
export function parseMarkdownString<T = Record<string, unknown>>(raw: string): {
  data: T;
  content: string;
} {
  const { data, content } = matter(raw);
  return { data: data as T, content };
}

/**
 * 读取 Markdown 文件（异步版本）。
 */
export async function parseMarkdownFileAsync<T = Record<string, unknown>>(filePath: string): Promise<{
  data: T;
  content: string;
}> {
  const raw = await fsp.readFile(filePath, 'utf-8');
  return parseMarkdownString<T>(raw);
}

/**
 * 将 frontmatter 数据和正文序列化为 Markdown 字符串并写入文件。
 */
export async function writeMarkdownFile(
  filePath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
  const markdown = matter.stringify(content, data);
  await fsp.writeFile(filePath, markdown, 'utf-8');
}

/**
 * 列出目录下所有文件（非递归）。
 */
export async function listFiles(dirPath: string, extension?: string): Promise<string[]> {
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && (!extension || e.name.endsWith(extension)))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * 列出目录下所有子目录。
 */
export async function listDirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * 提取章节编号（从文件名 chapter-NNN.md 或 chapter-NNN.txt 中）。
 */
export function extractChapterId(filename: string): number | null {
  const match = filename.match(/chapter-(\d+)\.(?:md|txt)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 格式化章节编号为零填充的三位数文件名。
 */
/**
 * 解码可能被 URL 编码的 slug（Next.js 可能不自动解码中文）。
 */
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/**
 * 格式化章节编号为零填充的三位数文件名。
 */
export function formatChapterFilename(chapterId: number, ext: 'md' | 'txt'): string {
  return `chapter-${String(chapterId).padStart(3, '0')}.${ext}`;
}
