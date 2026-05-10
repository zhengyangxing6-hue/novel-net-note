import Link from "next/link";
import type { NovelMeta } from "@/lib/types";

const statusMap: Record<string, { label: string; color: string }> = {
  ongoing: { label: "连载中", color: "bg-emerald-50 text-emerald-600" },
  completed: { label: "已完结", color: "bg-blue-50 text-blue-600" },
  hiatus: { label: "断更", color: "bg-amber-50 text-amber-600" },
  cancelled: { label: "已取消", color: "bg-rose-50 text-rose-600" },
};

export function NovelCard({ novel }: { novel: NovelMeta }) {
  const status = statusMap[novel.status] ?? statusMap.ongoing;

  return (
    <Link
      href={`/novels/${novel.slug}`}
      className="group block rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:-translate-y-0.5"
    >
      <h3 className="font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
        {novel.title}
      </h3>
      <p className="mt-1 text-sm text-slate-400">{novel.author}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
        {novel.genre.slice(0, 3).map((g) => (
          <span
            key={g}
            className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500"
          >
            {g}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-slate-300">
        <span>{novel.chapterCount} 章</span>
        <span>{(novel.wordCount / 10000).toFixed(0)} 万字</span>
      </div>
    </Link>
  );
}
