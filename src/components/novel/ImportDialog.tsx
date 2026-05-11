"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.(txt|md)$/, ""));
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name);
    fd.append("author", author);
    fd.append("genre", genre);

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">导入书籍</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">文件（.txt / .md）</label>
            <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFileChange} className="w-full text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">书名</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="自动从文件名提取" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">作者</label>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="未知作者" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">分类标签</label>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="如 仙侠（可选）" />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">取消</button>
          <button onClick={handleImport} disabled={!file || loading} className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50">
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />导入中…</> : <><Upload className="h-3.5 w-3.5" />导入</>}
          </button>
        </div>
      </div>
    </div>
  );
}
