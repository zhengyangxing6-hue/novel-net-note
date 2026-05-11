"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { HighlightData } from "@/lib/highlights";
import { X, Plus, Trash2, Palette } from "lucide-react";

const COLOR_OPTIONS = ["#FEF3C7","#DBEAFE","#D1FAE5","#FCE7F3","#E0E7FF","#FEE2E2","#CCFBF1","#FED7AA","#E9D5FF","#D9F99D"];

export default function PromptsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<HighlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTerm, setNewTerm] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    fetch(`/api/highlights?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [slug]);

  const removeTerm = async (term: string) => {
    if (!data) return;
    const newData = { ...data, terms: { ...data.terms } };
    delete newData.terms[term];
    setData(newData);
    await fetch(`/api/highlights?slug=${encodeURIComponent(slug)}&term=${encodeURIComponent(term)}`, { method: "DELETE" });
  };

  const addTerm = async () => {
    if (!data || !newTerm.trim() || !newCat.trim()) return;
    const updated = { ...data, terms: { ...data.terms, [newTerm.trim()]: newCat.trim() } };
    setData(updated);
    setNewTerm("");
    await fetch("/api/highlights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, terms: { [newTerm.trim()]: newCat.trim() } }) });
  };

  const addCategory = async () => {
    if (!data || !newCatName.trim()) return;
    await fetch("/api/highlights", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, category: newCatName.trim(), color: "#FEF3C7", style: "bg" }) });
    setData({ ...data, categories: { ...data.categories, [newCatName.trim()]: { color: "#FEF3C7", style: "bg" } } });
    setNewCatName("");
  };

  const removeCategory = async (cat: string) => {
    if (!data) return;
    const newData = { ...data, categories: { ...data.categories }, terms: { ...data.terms } };
    delete newData.categories[cat];
    for (const [t, c] of Object.entries(newData.terms)) { if (c === cat) delete newData.terms[t]; }
    setData(newData);
    await fetch(`/api/highlights?slug=${encodeURIComponent(slug)}&category=${encodeURIComponent(cat)}`, { method: "DELETE" });
  };

  const changeColor = async (cat: string, color: string) => {
    if (!data) return;
    const updated = { ...data, categories: { ...data.categories, [cat]: { ...data.categories[cat], color } } };
    setData(updated);
    await fetch("/api/highlights", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, category: cat, color, style: data.categories[cat]?.style || "bg" }) });
  };

  if (loading) return <div className="p-8 text-sm text-zinc-400">加载中…</div>;
  if (!data) return <div className="p-8 text-sm text-zinc-400">加载失败</div>;

  const grouped: Record<string, string[]> = {};
  for (const [term, cat] of Object.entries(data.terms)) {
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(term);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-bold text-zinc-900">提示词规则管理</h1>
      <p className="mt-1 text-xs text-zinc-500">分类和标记词在右键菜单中动态显示，AI 分析时自动注入 Prompt</p>

      {/* 分类管理 */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">分类管理</h3>
        <div className="space-y-2 mb-3">
          {Object.entries(data.categories).map(([cat, cfg]) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
              <span className="text-sm text-zinc-700 flex-1">{cat}</span>
              <span className="text-[11px] text-zinc-400">{cfg.style === 'underline' ? '下划线' : cfg.style === 'italic' ? '斜体' : '背景'}</span>
              <div className="flex items-center gap-0.5">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} className={`w-4 h-4 rounded-full border-2 ${cfg.color === c ? 'border-zinc-400' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => changeColor(cat, c)} title="换色" />
                ))}
              </div>
              <button onClick={() => removeCategory(cat)} className="p-1 text-zinc-300 hover:text-red-500" title="删除分类"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="新分类名（如 阵营A）" className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <button onClick={addCategory} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"><Plus className="h-3.5 w-3.5" />新增分类</button>
        </div>
      </div>

      {/* 按分类展示词 */}
      <div className="mt-4 space-y-4">
        {Object.entries(grouped).map(([cat, terms]) => (
          <div key={cat} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: data.categories[cat]?.color || "#ccc" }} />
              <h3 className="text-sm font-medium text-zinc-800">{cat}</h3>
              <span className="text-xs text-zinc-400">({terms.length} 词)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {terms.map((term) => (
                <span key={term} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs cursor-pointer hover:opacity-80" style={{ backgroundColor: data.categories[cat]?.color || "#FEF3C7" }} onClick={() => removeTerm(term)} title="点击移除">
                  {term}<X className="h-3 w-3 opacity-40" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 添加新词 */}
      <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-4">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">添加标记词</h3>
        <div className="flex items-center gap-2">
          <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="词（如 女巫）" className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm" onKeyDown={(e) => e.key === "Enter" && addTerm()} />
          <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white">
            <option value="">选择分类</option>
            {Object.keys(data.categories).map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
          <button onClick={addTerm} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"><Plus className="h-3.5 w-3.5" />添加</button>
        </div>
      </div>
    </div>
  );
}
