import { notFound } from "next/navigation";
import path from "path";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFileAsync, decodeSlug } from "@/lib/content-parser";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { CharacterProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; name: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

export default async function CharacterDetailPage({ params }: Props) {
  const { name, slug: encodedSlug } = await params;
  const slug = decodeSlug(encodedSlug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  const charFile = path.join(CONTENT_ROOT, slug, "characters", `${name}.md`);

  let data: CharacterProfile | null = null;
  let content = "";

  try {
    const parsed = await parseMarkdownFileAsync<CharacterProfile>(charFile);
    data = parsed.data;
    content = parsed.content;
  } catch {
    notFound();
  }

  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data.name}
              {data.aliases?.length > 0 && (
                <span className="ml-2 text-lg text-zinc-400">（{data.aliases.join("、")}）</span>
              )}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {data.role}
              </span>
              {data.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right text-sm text-zinc-400">
            <p>首次出场：第 {data.firstAppearance} 章</p>
            {data.lastAppearance && <p>最后出场：第 {data.lastAppearance} 章</p>}
            <p>出场次数：{data.appearances?.length ?? "未知"}</p>
          </div>
        </div>
        {data.arc && (
          <p className="mt-3 text-sm text-zinc-500 italic">成长弧：{data.arc}</p>
        )}
      </div>

      {/* 人物关系 */}
      {data.relationships && data.relationships.length > 0 && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-500">人物关系</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.relationships.map((rel, i) => (
              <div
                key={i}
                className="rounded-lg bg-white p-3 dark:bg-zinc-800"
              >
                <a
                  href={rel.target}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {rel.target.replace("characters/", "")}
                </a>
                <span className="ml-2 text-xs text-zinc-500">{rel.type}</span>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{rel.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <MarkdownRenderer content={content} />
    </div>
  );
}
