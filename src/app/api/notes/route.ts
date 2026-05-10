import { NextRequest, NextResponse } from "next/server";
import { writeMarkdownFile, parseMarkdownFileAsync } from "@/lib/content-parser";
import type { ChapterNote } from "@/lib/types";
import path from "path";

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

/**
 * GET /api/notes?slug=xxx&chapterId=1
 * 获取某章的笔记
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const chapterId = searchParams.get("chapterId");

  if (!slug || !chapterId) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  const padded = String(chapterId).padStart(3, "0");
  const filePath = path.join(CONTENT_ROOT, slug, "notes", `chapter-${padded}.md`);

  try {
    const { data, content } = await parseMarkdownFileAsync<ChapterNote>(filePath);
    return NextResponse.json({ data, content });
  } catch {
    return NextResponse.json({ data: null, content: "" });
  }
}

/**
 * POST /api/notes
 * 保存某章的笔记
 */
export async function POST(request: NextRequest) {
  try {
    const { slug, chapterId, content, tags } = await request.json();

    if (!slug || chapterId === undefined) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const padded = String(chapterId).padStart(3, "0");
    const filePath = path.join(CONTENT_ROOT, slug, "notes", `chapter-${padded}.md`);

    // 尝试读取已有笔记以保留 createdAt
    let createdAt = new Date().toISOString().split("T")[0];
    try {
      const { data } = await parseMarkdownFileAsync<ChapterNote>(filePath);
      createdAt = data.createdAt || createdAt;
    } catch {
      // 新笔记，使用当前日期
    }

    const frontmatter: ChapterNote = {
      chapterId,
      createdAt,
      updatedAt: new Date().toISOString().split("T")[0],
      tags: tags || [],
    };

    await writeMarkdownFile(filePath, frontmatter, content);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    );
  }
}
