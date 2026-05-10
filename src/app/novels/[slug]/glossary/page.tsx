import { notFound } from "next/navigation";
import Link from "next/link";
import path from "path";
import { getNovelMeta } from "@/lib/novels";
import { parseMarkdownFileAsync, listFiles, decodeSlug } from "@/lib/content-parser";
import type { GlossaryTerm } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const CONTENT_ROOT = path.resolve(process.cwd(), "content/novels");

const categoryColors: Record<string, string> = {
  "法术": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "物品": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "地点": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "组织": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "概念": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  "人物": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export default async function GlossaryPage({ params }: Props) {
  const slug = decodeSlug((await params).slug);
  const novel = getNovelMeta(slug);
  if (!novel) notFound();

  const glossaryDir = path.join(CONTENT_ROOT, slug, "glossary");
  const files = await listFiles(glossaryDir, ".md");

  const terms: (GlossaryTerm & { slug: string })[] = [];
  for (const file of files) {
    try {
      const { data } = await parseMarkdownFileAsync<GlossaryTerm>(
        path.join(glossaryDir, file)
      );
      terms.push({ ...data, slug: path.basename(file, ".md") });
    } catch {
      // 跳过
    }
  }

  terms.sort((a, b) => a.firstMention - b.firstMention);

  // 按类别分组
  const grouped: Record<string, (GlossaryTerm & { slug: string })[]> = {};
  for (const term of terms) {
    const cat = term.category || "其他";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(term);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">术语库</h1>
      <p className="mt-1 text-sm text-zinc-500">{terms.length} 个术语</p>

      {terms.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">暂无术语定义</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {Object.entries(grouped).map(([category, categoryTerms]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-medium text-zinc-500">{category}</h2>
              <div className="space-y-2">
                {categoryTerms.map((term) => (
                  <Link
                    key={term.slug}
                    href={`/novels/${slug}/glossary/${term.slug}`}
                    className="block rounded-lg border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {term.term}
                        </span>
                        {term.pinyin && (
                          <span className="text-xs text-zinc-400">{term.pinyin}</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">首次出现：第 {term.firstMention} 章</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {term.definition}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
