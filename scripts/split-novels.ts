/**
 * 将整本小说 txt 按章节拆分为 content/novels/<slug>/original/chapter-NNN.txt
 * 用法：npx tsx scripts/split-novels.ts
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONTENT_ROOT = path.resolve(__dirname, '..', 'content', 'novels');

interface NovelConfig {
  slug: string;
  title: string;
  author: string;
  sourceFile: string;            // 原始 txt 文件名
  chapterPattern: RegExp;        // 章节标题匹配（必须是行首）
  chapterNumberParser: (match: RegExpMatchArray) => number;
  genre: string[];
  status: string;
}

const novels: NovelConfig[] = [
  {
    slug: '放开那个女巫',
    title: '放开那个女巫',
    author: '二目',
    sourceFile: '放开那个女巫.txt',
    chapterPattern: /^第0*(\d+)章\s/,
    chapterNumberParser: (m) => parseInt(m[1], 10),
    genre: ['种田', '西幻', '科技'],
    status: 'completed',
  },
  {
    slug: '战国野心家',
    title: '战国野心家',
    author: '最后一个名',
    sourceFile: '战国野心家.txt',
    chapterPattern: /^第([一二三四五六七八九十百千]+)章\s/,
    chapterNumberParser: (m) => parseChineseNumber(m[1]),
    genre: ['历史', '争霸', '诸子百家'],
    status: 'completed',
  },
];

// 中文数字 → 阿拉伯数字
const CN_DIGITS: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  百: 100, 千: 1000,
};

function parseChineseNumber(cn: string): number {
  let result = 0;
  let current = 0;

  for (const char of cn) {
    const digit = CN_DIGITS[char];
    if (digit === undefined) continue;
    if (digit === 10) {
      current = (current || 1) * 10;
    } else if (digit === 100) {
      current = (current || 1) * 100;
    } else if (digit === 1000) {
      current = (current || 1) * 1000;
    } else {
      result += current;
      current = digit;
    }
  }
  return result + current;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function convertToUtf8(novelDir: string, sourceFile: string): string {
  const srcPath = path.join(novelDir, sourceFile);
  const utf8Path = path.join(novelDir, '_utf8_temp.txt');

  if (fs.existsSync(utf8Path)) return utf8Path;

  console.log(`  转码 GBK → UTF-8: ${sourceFile}`);
  try {
    execSync(`iconv -f gbk -t utf-8 "${srcPath}" > "${utf8Path}"`);
  } catch {
    // 尝试 GB18030
    execSync(`iconv -f gb18030 -t utf-8 "${srcPath}" > "${utf8Path}"`);
  }
  return utf8Path;
}

function splitNovel(config: NovelConfig): void {
  const novelDir = path.join(CONTENT_ROOT, config.slug);
  const originalDir = path.join(novelDir, 'original');
  const sourceFile = path.join(novelDir, config.sourceFile);

  if (!fs.existsSync(sourceFile)) {
    console.log(`  ✗ 未找到源文件: ${sourceFile}`);
    return;
  }

  console.log(`\n处理: ${config.title} (${config.slug})`);

  // 转换为 UTF-8
  const utf8Path = convertToUtf8(novelDir, config.sourceFile);
  const content = fs.readFileSync(utf8Path, 'utf-8');
  const lines = content.split('\n');

  ensureDir(originalDir);

  let currentChapterTitle = '';
  let currentLines: string[] = [];
  let chapterCount = 0;
  let seqNum = 0;  // 顺序编号，避免卷间重置覆盖

  // 用于跳过卷标题和前言
  let inPreamble = true;
  const volumePattern = /^第[一二三四五六七八九十百千]+卷\s/;

  for (const line of lines) {
    const match = line.match(config.chapterPattern);

    if (match) {
      // 保存上一章
      if (seqNum > 0 && currentLines.length > 5) {
        writeChapter(originalDir, seqNum, currentLines.join('\n'));
        chapterCount++;
      }

      seqNum++;
      currentLines = [line.trimEnd()];
      inPreamble = false;
    } else if (!inPreamble && seqNum > 0) {
      // 跳过卷标题行（但保留在其所属章节中）
      if (volumePattern.test(line) && currentLines.length < 10) {
        // 卷标题出现在章节开头附近，可能是真正的卷标记
        // 跳过它（不添加到章节内容中）
        continue;
      }
      currentLines.push(line.trimEnd());
    }
  }

  // 保存最后一章
  if (seqNum > 0 && currentLines.length > 5) {
    writeChapter(originalDir, seqNum, currentLines.join('\n'));
    chapterCount++;
  }

  // 清理临时文件
  try { fs.unlinkSync(utf8Path); } catch { /* ok */ }

  console.log(`  ✓ 拆分完成：${chapterCount} 章 → ${originalDir}`);

  // 创建 overview.md
  createOverview(novelDir, config, chapterCount);
}

function writeChapter(dir: string, chapterNum: number, content: string): void {
  const padded = String(chapterNum).padStart(3, '0');
  const filePath = path.join(dir, `chapter-${padded}.txt`);

  // 估算字数（中文字符数）
  const chineseChars = (content.match(/[一-鿿]/g) || []).length;

  fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8');
}

function createOverview(
  novelDir: string,
  config: NovelConfig,
  chapterCount: number
): void {
  // 计算总字数
  const originalDir = path.join(novelDir, 'original');
  let wordCount = 0;
  if (fs.existsSync(originalDir)) {
    const files = fs.readdirSync(originalDir).filter((f) => f.endsWith('.txt'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(originalDir, file), 'utf-8');
      wordCount += (content.match(/[一-鿿]/g) || []).length;
    }
  }

  const overview = `---
title: "${config.title}"
author: "${config.author}"
genre: ${JSON.stringify(config.genre)}
status: "${config.status}"
startYear: null
endYear: null
chapterCount: ${chapterCount}
wordCount: ${wordCount}
tags: []
---

## 内容概括

（待填写）

## 主题分析

（待填写）

## 阅读体验

（待填写）
`;

  fs.writeFileSync(path.join(novelDir, 'overview.md'), overview, 'utf-8');
  console.log(`  ✓ overview.md 已创建（${chapterCount} 章，约 ${Math.round(wordCount / 10000)} 万字）`);

  // 创建其他目录
  for (const dir of ['analysis', 'notes', 'characters', 'glossary', 'events', 'volumes']) {
    ensureDir(path.join(novelDir, dir));
  }
}

// 执行
function main(): void {
  for (const config of novels) {
    try {
      splitNovel(config);
    } catch (error) {
      console.error(`  ✗ 处理失败: ${error}`);
    }
  }
  console.log('\n全部完成！');
}

main();
