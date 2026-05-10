// ============================================================
// 核心类型定义 — 所有模块共享的数据结构
// ============================================================

// --- 小说元数据 ---
export interface NovelMeta {
  title: string;
  slug: string;
  author: string;
  genre: string[];
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  startYear: number;
  endYear: number | null;
  chapterCount: number;
  wordCount: number;
  tags: string[];
}

// --- 章节分析 frontmatter ---
export interface ChapterCharacter {
  name: string;
  role: string;
  firstAppearance: number;
  scenes: string[];
}

export interface ChapterRelationship {
  from: string;
  to: string;
  type: string;
  development: string;
}

export interface ForeshadowingRef {
  id: string;
  description: string;
  subtlety?: '低' | '中' | '高';
}

export interface WritingTechnique {
  name: string;
  example: string;
}

export interface ChapterAnalysis {
  chapterId: number;
  title: string;
  volume: number;
  arc: string;
  wordCount: number;
  characters: ChapterCharacter[];
  relationships: ChapterRelationship[];
  plotSummary: string;
  position: {
    arcStage: string;
    purpose: string;
  };
  foreshadowingPlanted: ForeshadowingRef[];
  foreshadowingPayoffs: ForeshadowingRef[];
  writingTechniques: WritingTechnique[];
  tags: string[];
}

// --- 用户笔记 ---
export interface ChapterNote {
  chapterId: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// --- 人物档案 ---
export interface CharacterRelation {
  target: string;     // slug 或路径
  type: string;
  summary: string;
}

export interface CharacterProfile {
  name: string;
  aliases: string[];
  role: string;
  firstAppearance: number;
  lastAppearance: number | null;
  tags: string[];
  relationships: CharacterRelation[];
  appearances: number[];
  arc: string;
}

// --- 术语 ---
export interface TermOccurrence {
  chapter: number;
  context: string;
}

export interface GlossaryTerm {
  term: string;
  pinyin?: string;
  category: string;
  firstMention: number;
  definition: string;
  occurrences: TermOccurrence[];
}

// --- 事件 ---
export interface NovelEvent {
  name: string;
  chapters: string;
  volume: number;
  arc: string;
  characters: string[];
  type: string;
  summary: string;
}

// --- 卷总结 ---
export interface VolumeSummary {
  volume: number;
  title: string;
  chapters: string;
  arc: string;
  characterCount: number;
  eventCount: number;
  summary: string;
}

// --- 结构分析 ---
export interface ArcInfo {
  name: string;
  chapters: string;
  summary: string;
  turningPoint?: string;
}

export interface StructureAnalysis {
  totalArcs: number;
  totalVolumes: number;
  arcs: ArcInfo[];
}

// --- 伏笔 ---
export interface ForeshadowingThread {
  id: string;
  description: string;
  category: '叙事' | '人物' | '世界观' | '主题';
  importance: '关键' | '重要' | '次要';
  setupChapters: number[];
  payoffChapters: number[];
  technique: string;
  status: '已回收' | '进行中' | '待回收';
}

export interface ForeshadowingData {
  threads: ForeshadowingThread[];
}

// --- 小说总览 ---
export interface NovelOverview extends NovelMeta {
  // frontmatter 即包含所有 NovelMeta 字段，body 为 Markdown 正文
}

// --- SQLite 索引相关 ---
export interface CharacterAppearance {
  novelSlug: string;
  characterSlug: string;
  chapterId: number;
  roleInChapter: string;
  scenes: string;
}

export interface WikiLink {
  sourceFile: string;
  targetFile: string;
  context: string;
}

// --- 分屏阅读器 props ---
export interface ReaderPageParams {
  slug: string;
  chapterId: string;
}

// --- API 响应类型 ---
export interface GrepResult {
  chapterId: number;
  line: number;
  context: string;
  match: string;
}

export interface AnalysisGenerateRequest {
  novelSlug: string;
  chapterId: number;
}

export interface SummaryGenerateRequest {
  novelSlug: string;
  startChapter: number;
  endChapter: number;
  type: 'custom' | 'volume';
  volumeNumber?: number;
}
