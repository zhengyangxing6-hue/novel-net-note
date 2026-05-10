import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { searchInNovel } from './grep';
import { formatChapterFilename } from './content-parser';
import type { ChapterAnalysis, CharacterProfile, GlossaryTerm, VolumeSummary } from './types';

const CONTENT_ROOT = path.resolve(process.cwd(), 'content/novels');
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/anthropic';
const MODEL = 'deepseek-v4-flash';

function getClient(): Anthropic {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未设置');
  return new Anthropic({ apiKey, baseURL: DEEPSEEK_BASE_URL });
}

async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const client = getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  // DeepSeek V4 Flash 可能先返回 thinking 块，取最后一个 text 块
  let textBlock: { type: string; text: string } | null = null;
  for (let i = resp.content.length - 1; i >= 0; i--) {
    const block = resp.content[i];
    if (block.type === 'text') {
      textBlock = block as { type: string; text: string };
      break;
    }
  }
  if (!textBlock) {
    throw new Error(`AI 未返回文本内容，blocks: ${resp.content.map(b => b.type).join(', ')}`);
  }
  console.log('[DeepSeek] Got text response, length:', textBlock.text.length);
  return textBlock.text;
}

function parseAIResponse<T>(response: string): { data: T; content: string } {
  // 记录响应前 500 字符用于调试
  console.log('[DeepSeek] Response preview:', response.slice(0, 500));

  // 尝试多种格式匹配
  // 格式 1: ```yaml ... ``` 或 ```markdown ... ```
  const codeBlockMatch = response.match(/```(?:yaml|markdown)?\s*\n([\s\S]*?)```/);
  const toParse = codeBlockMatch ? codeBlockMatch[1] : response;

  // 格式 2: YAML frontmatter
  const match = toParse.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (match) {
    try {
      const parsed = matter(toParse);
      if (Object.keys(parsed.data).length > 0) {
        return { data: parsed.data as T, content: parsed.content.trim() };
      }
    } catch { /* fall through */ }
  }

  // 格式 3: 尝试用 matter 直接解析
  try {
    const parsed = matter(toParse);
    if (Object.keys(parsed.data).length > 0) {
      return { data: parsed.data as T, content: parsed.content.trim() };
    }
  } catch { /* fall through */ }

  // 格式 4: 尝试提取 --- 块（可能有多余空格）
  const looseMatch = toParse.match(/---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)/);
  if (looseMatch) {
    try {
      const parsed = matter(toParse);
      return { data: parsed.data as T, content: parsed.content.trim() };
    } catch { /* fall through */ }
  }

  throw new Error('AI 返回格式不正确，需要包含 YAML frontmatter');
}

// ============================================================
// 章节分析
// ============================================================

const CHAPTER_ANALYSIS_SYSTEM = `你是一个专业的小说分析助手。你的任务是根据小说原文生成章节拆解分析。

你需要以 Markdown 格式输出，包含 YAML frontmatter 和正文。格式如下：

\`\`\`
---
chapterId: <章节编号>
title: "<章节标题>"
volume: <卷号>
arc: "<所属篇章名>"
wordCount: <字数>
characters:
  - name: "<角色名>"
    role: "主角/配角/反派/路人"
    firstAppearance: <首次出场章节>
    scenes: ["场景1描述", "场景2描述"]
relationships:
  - from: "<角色A>"
    to: "<角色B>"
    type: "<关系类型>"
    development: "<本章关系发展>"
plotSummary: "<2-3句话的剧情概括>"
position:
  arcStage: "开端/发展/高潮/过渡/结尾"
  purpose: "<本章对整体剧情的推进作用>"
foreshadowingPlanted:
  - id: "<小说slug>-fs-<编号>"
    description: "<伏笔描述>"
    subtlety: "低/中/高"
foreshadowingPayoffs:
  - id: "<小说slug>-fs-<编号>"
    description: "<回收了什么伏笔>"
writingTechniques:
  - name: "<技法名>"
    example: "<本章中的具体例子>"
tags: ["<标签1>", "<标签2>"]
---

## 详细剧情
（用2-3段详细描述本章的剧情发展，包含场景切换）

## 关键对话
> "原文引用1"
> "原文引用2"

## 写作技巧分析
（分析本章用到的写作技巧，以及可以从中学到什么）
\`\`\`

注意：
- 从原文中提取关键信息，不要编造不存在的剧情
- plotSummary 要简洁准确
- 写作技巧分析要具体，引用原文例子
- 伏笔要区分铺设和回收
- 所有字段必须填写`;

export async function generateChapterAnalysis(
  novelSlug: string,
  chapterId: number
): Promise<ChapterAnalysis & { content: string }> {
  const novelDir = path.join(CONTENT_ROOT, novelSlug);
  const originalFile = path.join(novelDir, 'original', formatChapterFilename(chapterId, 'txt'));

  let originalText: string;
  try {
    originalText = fs.readFileSync(originalFile, 'utf-8');
  } catch {
    throw new Error(`原文文件不存在：${originalFile}`);
  }

  // 截断过长的原文（保留前 8000 字符）
  const truncated = originalText.length > 8000 ? originalText.slice(0, 8000) + '\n\n[... 后续内容已截断 ...]' : originalText;

  const userMessage = `请分析以下小说章节原文，生成结构化分析：

小说 slug：${novelSlug}
章节编号：${chapterId}

原文：
\`\`\`
${truncated}
\`\`\``;

  const response = await callAI(CHAPTER_ANALYSIS_SYSTEM, userMessage);
  const { data, content } = parseAIResponse<ChapterAnalysis>(response);

  // 保存到 analysis/ 目录
  const analysisFile = path.join(novelDir, 'analysis', formatChapterFilename(chapterId, 'md'));
  const markdown = matter.stringify(content, data as unknown as Record<string, unknown>);
  await fsp.mkdir(path.dirname(analysisFile), { recursive: true });
  await fsp.writeFile(analysisFile, markdown, 'utf-8');

  return { ...data, content };
}

// ============================================================
// 术语定义
// ============================================================

const TERM_DEFINITION_SYSTEM = `你是一个专业的小说术语分析助手。你需要根据术语在原文中的出现上下文，给出准确的定义和分析。

输出格式：

\`\`\`
---
term: "<术语名>"
pinyin: "<拼音>"
category: "法术/物品/地点/组织/概念/人物/其他"
firstMention: <首次出现章节>
definition: "<一句话定义>"
occurrences:
  - chapter: <章节号>
    context: "<上下文摘要>"
---

## 详细定义
（结合所有上下文，给出该术语的全面定义）

## 在小说中的作用
（该术语对剧情推进、世界观构建的作用）
\`\`\`

注意：结合所有上下文给出准确的定义，不要主观臆测。`;

export async function generateTermDefinition(
  novelSlug: string,
  term: string
): Promise<GlossaryTerm & { content: string }> {
  const novelDir = path.join(CONTENT_ROOT, novelSlug);

  // 先搜索所有出现位置
  const occurrences = await searchInNovel(novelDir, term);

  if (occurrences.length === 0) {
    throw new Error(`未找到术语 "${term}" 的匹配结果`);
  }

  const occurrencesSummary = occurrences
    .map((o) => `第 ${o.chapterId} 章 第 ${o.line} 行：\n${o.match}\n上下文：\n${o.context}`)
    .join('\n\n---\n\n');

  const firstMention = occurrences[0].chapterId;

  const userMessage = `请为以下术语生成定义：

术语：${term}
小说 slug：${novelSlug}
首次出现：第 ${firstMention} 章

所有出现位置及上下文：
${occurrencesSummary}`;

  const response = await callAI(TERM_DEFINITION_SYSTEM, userMessage);
  const { data, content } = parseAIResponse<GlossaryTerm>(response);

  // 保存到 glossary/ 目录
  const termSlug = term.replace(/[^\w一-鿿]/g, '-').toLowerCase();
  const glossaryFile = path.join(novelDir, 'glossary', `${termSlug}.md`);
  const markdown = matter.stringify(content, data as unknown as Record<string, unknown>);
  await fsp.mkdir(path.dirname(glossaryFile), { recursive: true });
  await fsp.writeFile(glossaryFile, markdown, 'utf-8');

  return { ...data, content };
}

// ============================================================
// 卷总结 / 章节范围总结
// ============================================================

const VOLUME_SUMMARY_SYSTEM = `你是一个专业的小说分析助手。你需要对一段连续的章节进行大维度总结。

输出格式：

\`\`\`
---
volume: <卷号>
title: "<卷名>"
chapters: "<起始章-结束章>"
arc: "<篇章名>"
characterCount: <本卷出场人物数>
eventCount: <重大事件数>
summary: "<一句话概括本卷>"
---

## 卷大纲
（用 开端-发展-高潮-结尾 结构描述本卷的整体故事线）

## 人物发展
（本卷中各主要人物经历了什么变化，获得了什么成长）

## 伏笔汇总
（本卷铺设了哪些伏笔，回收了哪些伏笔）

## 可学习之处
（本卷在写作上有什么值得借鉴的地方，节奏、结构、人物塑造等）
\`\`\``;

export async function generateVolumeSummary(
  novelSlug: string,
  startChapter: number,
  endChapter: number,
  volumeNumber?: number
): Promise<VolumeSummary & { content: string }> {
  const novelDir = path.join(CONTENT_ROOT, novelSlug);
  const analysisDir = path.join(novelDir, 'analysis');

  // 读取所有相关章节的分析
  const chapters: string[] = [];
  for (let i = startChapter; i <= endChapter; i++) {
    try {
      const file = path.join(analysisDir, formatChapterFilename(i, 'md'));
      const raw = fs.readFileSync(file, 'utf-8');
      const { data, content } = matter(raw);
      chapters.push(`--- 第 ${i} 章 ---\n概括：${data.plotSummary || '无'}\n正文摘要：${content.slice(0, 300)}`);
    } catch {
      chapters.push(`第 ${i} 章：暂无分析`);
    }
  }

  const chapterTexts = chapters.join('\n\n');

  const userMessage = `请对以下章节范围进行大维度总结：

小说 slug：${novelSlug}
章节范围：第 ${startChapter} 章 - 第 ${endChapter} 章
${volumeNumber !== undefined ? `卷号：${volumeNumber}` : '自定义范围'}

各章节分析摘要：
${chapterTexts}`;

  const response = await callAI(VOLUME_SUMMARY_SYSTEM, userMessage);
  const { data, content } = parseAIResponse<VolumeSummary>(response);

  // 保存到 volumes/ 目录
  const volFilename = volumeNumber
    ? `volume-${String(volumeNumber).padStart(2, '0')}.md`
    : `summary-${startChapter}-${endChapter}.md`;
  const volumesDir = path.join(novelDir, 'volumes');
  const volFile = path.join(volumesDir, volFilename);
  const markdown = matter.stringify(content, data as unknown as Record<string, unknown>);
  await fsp.mkdir(path.dirname(volFile), { recursive: true });
  await fsp.writeFile(volFile, markdown, 'utf-8');

  return { ...data, content };
}

// ============================================================
// 人物档案
// ============================================================

const CHARACTER_PROFILE_SYSTEM = `你是一个专业的小说人物分析助手。你需要根据人物在小说中的所有出场，生成完整的人物档案。

输出格式：

\`\`\`
---
name: "<人物名>"
aliases: ["<别名>"]
role: "主角/反派/配角"
firstAppearance: <首次出场章节>
lastAppearance: <最后出场章节或null>
tags: ["<标签>"]
relationships:
  - target: "characters/<人物slug>"
    type: "<关系类型>"
    summary: "<关系简述>"
appearances:
  - <章节号>
arc: "<人物成长弧描述>"
---

## 人物概述
（人物的整体描述，包括出身、性格、目标）

## 性格分析
（人物的性格特点、行为模式、价值观）

## 关键转折
（人物经历的关键事件和转折点，列出章节号和影响）

## 与其他人物关系详解
（详细说明与各个人物的关系性质和演变）
\`\`\``;

export async function generateCharacterProfile(
  novelSlug: string,
  characterName: string
): Promise<CharacterProfile & { content: string }> {
  const novelDir = path.join(CONTENT_ROOT, novelSlug);

  // 搜索人物在原文中的所有出现
  const occurrences = await searchInNovel(novelDir, characterName);

  const occurrencesSummary = occurrences
    .slice(0, 20) // 限制数量以控制 token
    .map((o) => `第 ${o.chapterId} 章：${o.context}`)
    .join('\n\n');

  const firstMention = occurrences.length > 0 ? occurrences[0].chapterId : 1;
  const lastMention = occurrences.length > 0 ? occurrences[occurrences.length - 1].chapterId : null;

  const userMessage = `请为以下人物生成完整的档案：

人物名：${characterName}
小说 slug：${novelSlug}
首次出场：第 ${firstMention} 章
${lastMention ? `最后出场：第 ${lastMention} 章` : ''}
出场总次数：${occurrences.length}

出场上下文摘要（前 20 条）：
${occurrencesSummary}`;

  const response = await callAI(CHARACTER_PROFILE_SYSTEM, userMessage);
  const { data, content } = parseAIResponse<CharacterProfile>(response);

  // 保存到 characters/ 目录
  const charSlug = characterName.replace(/[^\w一-鿿]/g, '-').toLowerCase();
  const charFile = path.join(novelDir, 'characters', `${charSlug}.md`);
  const markdown = matter.stringify(content, data as unknown as Record<string, unknown>);
  await fsp.mkdir(path.dirname(charFile), { recursive: true });
  await fsp.writeFile(charFile, markdown, 'utf-8');

  return { ...data, content };
}
