import { notFound } from "next/navigation";
import Link from "next/link";
import path from "path";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFileAsync, listFiles, decodeSlug } from "@/lib/content-parser";
import type { CharacterProfile } from "@/lib/types";
import { User, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

export default async function CharactersPage({ params }: Props) {
  const slug = decodeSlug((await params).slug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  const charsDir = path.join(CONTENT_ROOT, slug, "characters");
  const files = await listFiles(charsDir, ".md");

  const characters: (CharacterProfile & { slug: string })[] = [];
  for (const file of files) {
    try {
      const { data } = await parseMarkdownFileAsync<CharacterProfile>(
        path.join(charsDir, file)
      );
      characters.push({ ...data, slug: path.basename(file, ".md") });
    } catch {
      // 跳过无法解析的文件
    }
  }

  characters.sort((a, b) => a.firstAppearance - b.firstAppearance);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">人物库</h1>
      <p className="mt-1 text-sm text-zinc-500">{characters.length} 个角色</p>

      {characters.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">暂无人物档案</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {characters.map((char) => (
            <Link
              key={char.slug}
              href={`/novels/${slug}/characters/${char.slug}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {char.name}
                    {char.aliases?.length > 0 && (
                      <span className="ml-2 text-sm text-zinc-400">
                        （{char.aliases.join("、")}）
                      </span>
                    )}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {char.role}
                    </span>
                    {char.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />第 {char.firstAppearance} 章
                  </span>
                  {char.appearances && (
                    <span>{char.appearances.length} 次出场</span>
                  )}
                </div>
              </div>
              {char.arc && (
                <p className="mt-2 text-sm text-zinc-500 truncate">{char.arc}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
