import { NextRequest, NextResponse } from "next/server";
import { searchInNovel } from "@/lib/grep";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { term, slug } = await request.json();

    if (!term || !slug) {
      return NextResponse.json({ error: "缺少参数 term 或 slug" }, { status: 400 });
    }

    const novelDir = path.resolve(process.cwd(), "content/novels", slug);
    const results = await searchInNovel(novelDir, term);

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "搜索失败" },
      { status: 500 }
    );
  }
}
