"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Sparkles, Loader2, FileText } from "lucide-react";

export default function SummaryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [startChapter, setStartChapter] = useState("");
  const [endChapter, setEndChapter] = useState("");
  const [volumeNumber, setVolumeNumber] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const start = parseInt(startChapter, 10);
    const end = parseInt(endChapter, 10);
    if (isNaN(start) || isNaN(end) || start > end) {
      setError("请输入有效的章节范围");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "volume",
          slug,
          startChapter: start,
          endChapter: end,
          volumeNumber: volumeNumber ? parseInt(volumeNumber, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setResult(`卷总结已生成！保存至 volumes/ 目录。
      卷号：${data.data.volume || "自定义"}
      章节范围：${data.data.chapters}
      概要：${data.data.summary}

      正文内容已保存，可在侧边栏「总结」页面查看。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">章节范围总结</h1>
      <p className="mt-1 text-sm text-zinc-500">选择章节范围，由 AI 生成大维度总结</p>

      <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              起始章节
            </label>
            <input
              type="number"
              value={startChapter}
              onChange={(e) => setStartChapter(e.target.value)}
              placeholder="如 1"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              结束章节
            </label>
            <input
              type="number"
              value={endChapter}
              onChange={(e) => setEndChapter(e.target.value)}
              placeholder="如 200"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              卷号（可选）
            </label>
            <input
              type="number"
              value={volumeNumber}
              onChange={(e) => setVolumeNumber(e.target.value)}
              placeholder="如 1"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />AI 分析中…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />生成总结
            </>
          )}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {result && (
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            <pre className="whitespace-pre-wrap font-sans">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
