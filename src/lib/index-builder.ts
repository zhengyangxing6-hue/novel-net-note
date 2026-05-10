import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { parseMarkdownFileAsync, listDirs, listFiles, extractChapterId } from './content-parser';
import type {
  ChapterAnalysis,
  CharacterProfile,
  GlossaryTerm,
  NovelEvent,
  VolumeSummary,
  ForeshadowingData,
  NovelMeta,
} from './types';

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * 扫描 content/novels/ 下所有 Markdown 文件，重建 SQLite 索引。
 * 作为 CLI 脚本运行：npx tsx src/lib/index-builder.ts
 */
export async function buildIndex(contentRoot: string, dbPath: string): Promise<void> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  createTables(db);

  const novelSlugs = await listDirs(contentRoot);
  const templateDir = '_templates';

  for (const slug of novelSlugs) {
    if (slug === templateDir || slug.startsWith('.')) continue;

    const novelDir = path.join(contentRoot, slug);
    await indexNovel(db, slug, novelDir);
  }

  db.close();
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_appearances (
      novel_slug TEXT NOT NULL,
      character_slug TEXT NOT NULL,
      chapter_id INTEGER NOT NULL,
      role_in_chapter TEXT,
      scenes TEXT,
      PRIMARY KEY (novel_slug, character_slug, chapter_id)
    );

    CREATE TABLE IF NOT EXISTS wikilinks (
      source_file TEXT NOT NULL,
      target_file TEXT NOT NULL,
      context TEXT,
      PRIMARY KEY (source_file, target_file)
    );

    CREATE TABLE IF NOT EXISTS term_occurrences (
      term_slug TEXT NOT NULL,
      chapter_id INTEGER NOT NULL,
      context TEXT,
      PRIMARY KEY (term_slug, chapter_id)
    );

    CREATE TABLE IF NOT EXISTS event_timeline (
      event_slug TEXT NOT NULL,
      chapter_start INTEGER NOT NULL,
      chapter_end INTEGER,
      characters TEXT,
      volume INTEGER,
      arc TEXT,
      PRIMARY KEY (event_slug)
    );

    CREATE TABLE IF NOT EXISTS foreshadowing_threads (
      thread_id TEXT PRIMARY KEY,
      novel_slug TEXT NOT NULL,
      description TEXT,
      category TEXT,
      importance TEXT,
      setup_chapters TEXT,
      payoff_chapters TEXT,
      technique TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS novel_index (
      slug TEXT PRIMARY KEY,
      title TEXT,
      author TEXT,
      genre TEXT,
      status TEXT,
      chapter_count INTEGER,
      word_count INTEGER
    );
  `);
}

async function indexNovel(
  db: Database.Database,
  slug: string,
  novelDir: string
): Promise<void> {
  // 1. 索引入口
  await indexOverview(db, slug, novelDir);

  // 2. 索引章节分析
  await indexChapters(db, slug, novelDir);

  // 3. 索引人物
  await indexCharacters(db, slug, novelDir);

  // 4. 索引术语
  await indexGlossary(db, slug, novelDir);

  // 5. 索引事件
  await indexEvents(db, slug, novelDir);

  // 6. 索引伏笔
  await indexForeshadowing(db, slug, novelDir);

  // 7. 全局扫描 wikilinks
  await indexWikiLinks(db, slug, novelDir);
}

async function indexOverview(
  db: Database.Database,
  slug: string,
  novelDir: string
): Promise<void> {
  const overviewPath = path.join(novelDir, 'overview.md');
  try {
    const { data } = await parseMarkdownFileAsync<NovelMeta>(overviewPath);
    db.prepare(`
      INSERT OR REPLACE INTO novel_index (slug, title, author, genre, status, chapter_count, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      slug,
      data.title,
      data.author,
      JSON.stringify(data.genre),
      data.status,
      data.chapterCount,
      data.wordCount
    );
  } catch {
    // overview.md 不存在，跳过
  }
}

async function indexChapters(
  db: Database.Database,
  slug: string,
  novelDir: string
): Promise<void> {
  const analysisDir = path.join(novelDir, 'analysis');
  const files = await listFiles(analysisDir, '.md');

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO character_appearances (novel_slug, character_slug, chapter_id, role_in_chapter, scenes)
    VALUES (?, ?, ?, ?, ?)
  `);

  // 每个章节每个角色一条记录
  const deleteChapters = db.prepare(
    'DELETE FROM character_appearances WHERE novel_slug = ?'
  );
  deleteChapters.run(slug);

  for (const file of files) {
    const chapterId = extractChapterId(file);
    if (chapterId === null) continue;

    try {
      const { data } = await parseMarkdownFileAsync<ChapterAnalysis>(
        path.join(analysisDir, file)
      );

      if (data.characters) {
        for (const char of data.characters) {
          const charSlug = char.name.toLowerCase().replace(/\s+/g, '-');
          insertStmt.run(
            slug,
            charSlug,
            chapterId,
            char.role,
            JSON.stringify(char.scenes || [])
          );
        }
      }
    } catch {
      // 解析失败，跳过
    }
  }
}

async function indexCharacters(
  db: Database.Database,
  _slug: string,
  novelDir: string
): Promise<void> {
  const charsDir = path.join(novelDir, 'characters');
  const files = await listFiles(charsDir, '.md');

  // 人物出现信息已从章节分析中提取，这里主要解析人物关系
  // 人物档案本身维护了 relationships 和 appearances
  for (const file of files) {
    try {
      const { data } = await parseMarkdownFileAsync<CharacterProfile>(
        path.join(charsDir, file)
      );

      const charSlug = path.basename(file, '.md');

      // 更新人物出场记录（如果人物档案有 appearances 列表）
      if (data.appearances && data.appearances.length > 0) {
        const upsert = db.prepare(`
          INSERT OR REPLACE INTO character_appearances (novel_slug, character_slug, chapter_id, role_in_chapter, scenes)
          VALUES (?, ?, ?, ?, ?)
        `);
        // appearances 是章节编号数组，按需求可能是完整的出场列表
      }
    } catch {
      // 跳过
    }
  }
}

async function indexGlossary(
  db: Database.Database,
  _slug: string,
  novelDir: string
): Promise<void> {
  const glossaryDir = path.join(novelDir, 'glossary');
  const files = await listFiles(glossaryDir, '.md');

  const deleteTerms = db.prepare('DELETE FROM term_occurrences WHERE term_slug = ?');
  const insertTerm = db.prepare(`
    INSERT OR REPLACE INTO term_occurrences (term_slug, chapter_id, context)
    VALUES (?, ?, ?)
  `);

  for (const file of files) {
    const termSlug = path.basename(file, '.md');
    deleteTerms.run(termSlug);

    try {
      const { data } = await parseMarkdownFileAsync<GlossaryTerm>(
        path.join(glossaryDir, file)
      );

      if (data.occurrences) {
        for (const occ of data.occurrences) {
          insertTerm.run(termSlug, occ.chapter, occ.context);
        }
      }
    } catch {
      // 跳过
    }
  }
}

async function indexEvents(
  db: Database.Database,
  _slug: string,
  novelDir: string
): Promise<void> {
  const eventsDir = path.join(novelDir, 'events');
  const files = await listFiles(eventsDir, '.md');

  const deleteEvents = db.prepare('DELETE FROM event_timeline WHERE event_slug = ?');
  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO event_timeline (event_slug, chapter_start, chapter_end, characters, volume, arc)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const file of files) {
    const eventSlug = path.basename(file, '.md');
    deleteEvents.run(eventSlug);

    try {
      const { data } = await parseMarkdownFileAsync<NovelEvent>(
        path.join(eventsDir, file)
      );

      const chaptersStr = data.chapters;
      const [startStr, endStr] = chaptersStr.includes('-')
        ? chaptersStr.split('-')
        : [chaptersStr, chaptersStr];

      insertEvent.run(
        eventSlug,
        parseInt(startStr, 10),
        endStr ? parseInt(endStr, 10) : parseInt(startStr, 10),
        JSON.stringify(data.characters),
        data.volume,
        data.arc
      );
    } catch {
      // 跳过
    }
  }
}

async function indexForeshadowing(
  db: Database.Database,
  slug: string,
  novelDir: string
): Promise<void> {
  const fsPath = path.join(novelDir, 'foreshadowing.md');
  try {
    const { data } = await parseMarkdownFileAsync<ForeshadowingData>(fsPath);

    const deleteThreads = db.prepare(
      'DELETE FROM foreshadowing_threads WHERE novel_slug = ?'
    );
    deleteThreads.run(slug);

    const insertThread = db.prepare(`
      INSERT OR REPLACE INTO foreshadowing_threads
        (thread_id, novel_slug, description, category, importance, setup_chapters, payoff_chapters, technique, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (data.threads) {
      for (const thread of data.threads) {
        insertThread.run(
          thread.id,
          slug,
          thread.description,
          thread.category,
          thread.importance,
          JSON.stringify(thread.setupChapters),
          JSON.stringify(thread.payoffChapters),
          thread.technique,
          thread.status
        );
      }
    }
  } catch {
    // foreshadowing.md 不存在
  }
}

async function indexWikiLinks(
  db: Database.Database,
  slug: string,
  novelDir: string
): Promise<void> {
  const deleteLinks = db.prepare('DELETE FROM wikilinks WHERE source_file LIKE ?');
  deleteLinks.run(`content/novels/${slug}/%`);

  const insertLink = db.prepare(`
    INSERT OR REPLACE INTO wikilinks (source_file, target_file, context)
    VALUES (?, ?, ?)
  `);

  const dirsToScan = ['analysis', 'notes', 'characters', 'glossary', 'events', 'volumes'];

  for (const subDir of dirsToScan) {
    const dirPath = path.join(novelDir, subDir);
    const files = await listFiles(dirPath, '.md');

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const { content } = await parseMarkdownFileAsync(filePath);
        const matches = content.matchAll(WIKILINK_REGEX);

        for (const match of matches) {
          const target = match[1];
          const start = Math.max(0, match.index - 20);
          const end = Math.min(content.length, match.index + match[0].length + 20);
          const context = content.slice(start, end).replace(/\n/g, ' ');

          const relativePath = `content/novels/${slug}/${subDir}/${file}`;
          insertLink.run(relativePath, target, context);
        }
      } catch {
        // 跳过
      }
    }
  }
}

// 允许直接运行此脚本
if (process.argv[1]?.endsWith('index-builder') || process.argv[1]?.endsWith('index-builder.ts')) {
  const contentRoot = path.resolve(process.cwd(), 'content/novels');
  const dbPath = path.resolve(process.cwd(), 'data/index.db');
  buildIndex(contentRoot, dbPath)
    .then(() => console.log('索引构建完成'))
    .catch(console.error);
}
