import { getAllNovels } from "@/lib/novels";
import { NovelCard } from "@/components/novel/NovelCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const novels = await getAllNovels();

  return (
    <div className="p-10 md:p-14 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">
          全部藏书
        </h1>
        <p className="text-slate-400 font-light text-sm">
          在这里管理你的数字书房，享受纯粹的阅读时光。
        </p>
      </div>

      {novels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-16 text-center">
          <p className="text-slate-400">还没有导入任何小说</p>
          <p className="mt-1 text-sm text-slate-300">
            在 <code className="rounded bg-slate-100 px-1">content/novels/&lt;slug&gt;/</code> 下创建目录并放入原文和分析文件
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {novels.map((novel) => (
            <NovelCard key={novel.slug} novel={novel} />
          ))}
        </div>
      )}
    </div>
  );
}
