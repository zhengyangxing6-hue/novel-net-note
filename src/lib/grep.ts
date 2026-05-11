import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { GrepResult } from './types';

const CONTEXT_LINES = 2;
const MAX_RESULTS = 50;

/**
 * 在所有章节原文中搜索关键词，返回所有出现位置及上下文。
 */
export async function searchInNovel(
  novelDir: string,
  term: string
): Promise<GrepResult[]> {
  const originalDir = path.join(novelDir, 'original');
  return searchWithNode(originalDir, term);
}

/**
 * 使用 Node.js 搜索原文，返回干净的上下文。
 */
async function searchWithNode(originalDir: string, term: string): Promise<GrepResult[]> {
  const results: GrepResult[] = [];

  let files: string[];
  try {
    files = (await fs.readdir(originalDir))
      .filter((f) => f.endsWith('.txt'))
      .sort();
  } catch {
    return [];
  }

  for (const file of files) {
    if (results.length >= MAX_RESULTS) break;

    const chapterMatch = file.match(/chapter-(\d+)\.txt$/);
    if (!chapterMatch) continue;

    const chapterId = parseInt(chapterMatch[1], 10);
    const content = await fs.readFile(path.join(originalDir, file), 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (results.length >= MAX_RESULTS) break;
      if (lines[i].includes(term)) {
        const start = Math.max(0, i - CONTEXT_LINES);
        const end = Math.min(lines.length, i + CONTEXT_LINES + 1);
        // 只取行内容，去掉文件名和行号前缀
        const contextLines = lines.slice(start, end).map((l) => l.trim());

        results.push({
          chapterId,
          line: i + 1,
          context: contextLines.join('\n'),
          match: lines[i].trim(),
        });
      }
    }
  }

  return results;
}

/**
 * 统计术语在原文中的出现次数（使用系统 grep 快速统计）。
 */
export async function countTermOccurrences(
  novelDir: string,
  terms: string[]
): Promise<Record<string, number>> {
  const originalDir = path.join(novelDir, 'original');
  const result: Record<string, number> = {};

  for (const term of terms) {
    try {
      const cmd = `grep -ric --include="*.txt" "${escapeShellArg(term)}" "${originalDir}"`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      // 解析每个文件的计数并求和
      const lines = output.trim().split('\n').filter(Boolean);
      let total = 0;
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          total += parseInt(parts[parts.length - 1], 10) || 0;
        }
      }
      result[term] = total;
    } catch {
      result[term] = 0;
    }
  }

  return result;
}

function escapeShellArg(arg: string): string {
  return arg.replace(/'/g, "'\\''");
}
