import { notFound } from "next/navigation";
import path from "path";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFileAsync, decodeSlug } from "@/lib/content-parser";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { GlossaryTerm } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; term: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

export default async function GlossaryTermPage({ params }: Props) {
  const { term, slug: encodedSlug } = await params;
  const slug = decodeSlug(encodedSlug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  const termFile = path.join(CONTENT_ROOT, slug, "glossary", `${term}.md`);

  let data: GlossaryTerm | null = null;
  let content = "";

  try {
    const parsed = await parseMarkdownFileAsync<GlossaryTerm>(termFile);
    data = parsed.data;
    content = parsed.content;
  } catch {
    notFound();
  }

  if (!data) notFound();

  const categoryColors: Record<string, string> = {
    "法术": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "物品": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "地点": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "组织": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "概念": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    "人物": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.term}</h1>
          {data.pinyin && <span className="text-zinc-400">{data.pinyin}</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm ${categoryColors[data.category] || ''}`}>
            {data.category}
          </span>
          <span className="text-sm text-zinc-400">首次出现：第 {data.firstMention} 章</span>
        </div>
        {data.definition && (
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">{data.definition}</p>
        )}
      </div>

      {/* 出现位置列表 */}
      {data.occurrences && data.occurrences.length > 0 && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-500">出现位置</h2>
          <div className="mt-3 space-y-2">
            {data.occurrences.map((occ, i) => (
              <div
                key={i}
                className="rounded-lg bg-white p-3 dark:bg-zinc-800"
              >
                <span className="text-xs font-medium text-zinc-400">第 {occ.chapter} 章</span>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{occ.context}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <MarkdownRenderer content={content} />
    </div>
  );
}
