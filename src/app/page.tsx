import { getAllNovels } from "@/lib/novels";
import { NovelCard } from "@/components/novel/NovelCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const novels = await getAllNovels();

  return (
    <div className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">小说分析库</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            拆解分析经典网络小说，学习大纲节奏与写作技法
          </p>
        </div>

        {novels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-16 text-center dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400">还没有导入任何小说</p>
            <p className="mt-1 text-sm text-zinc-400">
              在 <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">content/novels/&lt;slug&gt;/</code> 下创建目录并放入原文和分析文件
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {novels.map((novel) => (
              <NovelCard key={novel.slug} novel={novel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
