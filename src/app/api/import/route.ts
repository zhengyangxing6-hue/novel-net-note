import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { writeMarkdownFile } from "@/lib/content-parser";

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "未选择文件" }, { status: 400 });

    const title = (formData.get("title") as string) || file.name.replace(/\.(txt|md)$/, "");
    const author = (formData.get("author") as string) || "未知作者";
    const genre = (formData.get("genre") as string) || "其他";

    // 生成 slug
    const slug = title.replace(/[^\w一-鿿]/g, "-").replace(/-+/g, "-").toLowerCase();

    const novelDir = path.join(CONTENT_ROOT, slug);
    if (fs.existsSync(novelDir)) {
      return NextResponse.json({ error: `书籍 "${slug}" 已存在` }, { status: 409 });
    }

    // 创建目录结构
    for (const sub of ["original", "analysis", "notes", "characters", "glossary", "events", "volumes"]) {
      fs.mkdirSync(path.join(novelDir, sub), { recursive: true });
    }

    // 读取文件内容
    let content = await file.text();

    // 如果文件是 GBK 编码，尝试用 iconv 转换
    const sample = content.slice(0, 500);
    if (/[^\x00-\x7F一-鿿\s]/.test(sample) && !/[一-鿿]/.test(sample)) {
      try {
        const tmpIn = path.join(novelDir, "_input.tmp");
        const tmpOut = path.join(novelDir, "_utf8.tmp");
        fs.writeFileSync(tmpIn, Buffer.from(await file.arrayBuffer()));
        execSync(`iconv -f gbk -t utf-8 "${tmpIn}" > "${tmpOut}"`);
        content = fs.readFileSync(tmpOut, "utf-8");
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
      } catch {
        // 保持原样
      }
    }

    const lines = content.split("\n");

    // 尝试自动检测章节模式
    let chapterPattern: RegExp | null = null;
    const arabicChapter = /^第0*(\d+)章\s/;
    const chineseChapter = /^第([一二三四五六七八九十百千]+)章\s/;

    for (const line of lines.slice(0, 50)) {
      if (arabicChapter.test(line)) { chapterPattern = arabicChapter; break; }
      if (chineseChapter.test(line)) { chapterPattern = chineseChapter; break; }
    }

    let chapterCount = 0;
    let wordCount = 0;

    if (chapterPattern) {
      // 按章节拆分
      let currentLines: string[] = [];
      let seqNum = 0;
      let inPreamble = true;

      for (const line of lines) {
        if (chapterPattern.test(line)) {
          if (seqNum > 0 && currentLines.length > 5) {
            writeChapterFile(path.join(novelDir, "original"), seqNum, currentLines.join("\n"));
            chapterCount++;
          }
          seqNum++;
          currentLines = [line.trimEnd()];
          inPreamble = false;
        } else if (!inPreamble && seqNum > 0) {
          currentLines.push(line.trimEnd());
        }
      }

      if (seqNum > 0 && currentLines.length > 5) {
        writeChapterFile(path.join(novelDir, "original"), seqNum, currentLines.join("\n"));
        chapterCount++;
      }

      wordCount = countChineseChars(novelDir);
    } else {
      // 无法识别章节，整本存为单章
      writeChapterFile(path.join(novelDir, "original"), 1, content);
      chapterCount = 1;
      wordCount = (content.match(/[一-鿿]/g) || []).length;
    }

    // 创建 overview.md
    await writeMarkdownFile(
      path.join(novelDir, "overview.md"),
      {
        title,
        author,
        genre: [genre],
        status: "completed",
        startYear: null,
        endYear: null,
        chapterCount,
        wordCount,
        tags: [],
      },
      "## 内容概括\n\n（待填写）\n\n## 主题分析\n\n（待填写）\n\n## 阅读体验\n\n（待填写）\n"
    );

    return NextResponse.json({
      success: true,
      novel: { slug, title, author, chapterCount, wordCount },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function writeChapterFile(dir: string, chapterNum: number, content: string): void {
  const padded = String(chapterNum).padStart(3, "0");
  fs.writeFileSync(path.join(dir, `chapter-${padded}.txt`), content.trim() + "\n", "utf-8");
}

function countChineseChars(novelDir: string): number {
  const originalDir = path.join(novelDir, "original");
  let count = 0;
  if (fs.existsSync(originalDir)) {
    for (const f of fs.readdirSync(originalDir)) {
      if (f.endsWith(".txt")) {
        const c = fs.readFileSync(path.join(originalDir, f), "utf-8");
        count += (c.match(/[一-鿿]/g) || []).length;
      }
    }
  }
  return count;
}
