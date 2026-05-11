"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ChapterAnalysis, ChapterNote } from "@/lib/types";
import type { HighlightData } from "@/lib/highlights";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { HighlightedText } from "@/components/novel/HighlightedText";
import { Panel, Group, Separator } from "react-resizable-panels";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  ChevronLeft,
  ChevronRight,
  Highlighter,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Sparkles,
  Loader2,
  Scissors,
  X,
  Copy,
  Check,
  Tag,
} from "lucide-react";

interface ReaderClientProps {
  slug: string;
  chapterId: number;
  originalText: string;
  analysisData: ChapterAnalysis | null;
  analysisContent: string;
  notesData: ChapterNote | null;
  notesContent: string;
  prevChapter: number | null;
  nextChapter: number | null;
  totalChapters: number;
}

type ContextMenuState = {
  x: number;
  y: number;
  selectedText: string;
  selectedLine: number;   // 点击位置所在行号
} | null;

const BK_STORAGE_KEY = (slug: string, chapterId: number) =>
  `breakpoints-${slug}-${chapterId}`;

export function ReaderClient({
  slug,
  chapterId,
  originalText,
  analysisData,
  analysisContent,
  notesContent: initialNotesContent,
  prevChapter,
  nextChapter,
  totalChapters,
}: ReaderClientProps) {
  const router = useRouter();

  // 笔记面板
  const [notesVisible, setNotesVisible] = useState(true);
  const [notesText, setNotesText] = useState(initialNotesContent);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // 右键菜单
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  // 全局高亮数据
  const [highlightData, setHighlightData] = useState<HighlightData>({ categories: {}, terms: {} });
  const highlightsLoaded = useRef(false);

  // 加载全局高亮
  useEffect(() => {
    highlightsLoaded.current = false;
    fetch(`/api/highlights?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) setHighlightData(data);
        highlightsLoaded.current = true;
      })
      .catch(() => {});
  }, [slug]);

  // 构建 highlights Map（term → color）
  const highlights = new Map<string, string>();
  for (const [term, cat] of Object.entries(highlightData.terms)) {
    const color = highlightData.categories[cat]?.color || '#FEF3C7';
    highlights.set(term, color);
  }

  // 断点
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());

  // AI
  const [analysisGenerating, setAnalysisGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [termGenerating, setTermGenerating] = useState(false);

  // 从 localStorage 恢复断点
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BK_STORAGE_KEY(slug, chapterId));
      if (raw) setBreakpoints(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, [slug, chapterId]);

  // 切换章节时重置笔记 + 保存阅读进度
  useEffect(() => {
    setNotesText(initialNotesContent);
    setSaveStatus("idle");
    localStorage.setItem(`reading-progress-${slug}`, String(chapterId));
  }, [chapterId, initialNotesContent]);

  // 自动保存笔记
  const autoSave = useCallback(
    (text: string) => {
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, chapterId, content: text }),
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, 2000);
    },
    [slug, chapterId]
  );

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotesText(text);
    autoSave(text);
  };

  // 计算点击位置所在行号
  const getLineNumberFromClick = (e: React.MouseEvent<HTMLDivElement>): number => {
    const target = e.target as HTMLElement;
    const container = target.closest(".original-panel") as HTMLElement;
    if (!container) return 0;

    // 用点击位置和行高估算行号
    const rect = container.getBoundingClientRect();
    const lineHeight = 24; // 原文行高约为 24px (text-sm leading-7 ≈ 14px * 1.75 = 24.5px)
    const scrollTop = container.scrollTop;
    const clickY = e.clientY - rect.top + scrollTop;
    const paddingTop = 16; // p-4
    return Math.max(1, Math.floor((clickY - paddingTop) / lineHeight) + 1);
  };

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    e.preventDefault();
    const lineNum = getLineNumberFromClick(e);

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      selectedText: selectedText || "",
      selectedLine: lineNum,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  // 标记词为某个分类
  const handleTagAs = async (category: string) => {
    if (!contextMenu || !contextMenu.selectedText) return;
    const term = contextMenu.selectedText;
    closeContextMenu();

    const newData: HighlightData = {
      categories: { ...highlightData.categories },
      terms: { ...highlightData.terms, [term]: category },
    };

    // 乐观更新
    setHighlightData(newData);

    await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, terms: { [term]: category } }),
    });
  };

  // 取消高亮
  const handleRemoveHighlight = async (term: string) => {
    const newData: HighlightData = {
      categories: { ...highlightData.categories },
      terms: { ...highlightData.terms },
    };
    delete newData.terms[term];
    setHighlightData(newData);

    await fetch(`/api/highlights?slug=${encodeURIComponent(slug)}&term=${encodeURIComponent(term)}`, {
      method: "DELETE",
    });
  };

  // 加入/取消断点
  const handleToggleBreakpoint = () => {
    if (!contextMenu) return;
    const line = contextMenu.selectedLine;
    if (line <= 0) return;
    closeContextMenu();

    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(line)) {
        next.delete(line);
      } else {
        next.add(line);
      }
      localStorage.setItem(BK_STORAGE_KEY(slug, chapterId), JSON.stringify([...next]));
      return next;
    });
  };

  // 当前行是否有断点
  const lineHasBreakpoint = contextMenu && breakpoints.has(contextMenu.selectedLine);

  // AI 生成分析
  const handleGenerateAnalysis = async () => {
    setAnalysisGenerating(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chapter", slug, chapterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      router.refresh();
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "生成失败");
    } finally {
      setAnalysisGenerating(false);
    }
  };

  // AI 创建术语
  const handleCreateTerm = async () => {
    if (!contextMenu || !contextMenu.selectedText) return;
    const term = contextMenu.selectedText;
    closeContextMenu();
    setTermGenerating(true);
    try {
      const res = await fetch("/api/analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "term", slug, term }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setNotesText(
        (prev) =>
          prev +
          `\n\n术语「${term}」已生成定义，见 [[glossary/${term.replace(/[^\w一-鿿]/g, "-").toLowerCase()}]]`
      );
    } catch (error) {
      setNotesText(
        (prev) =>
          prev + `\n\n[术语生成失败：${error instanceof Error ? error.message : "未知错误"}]`
      );
    } finally {
      setTermGenerating(false);
    }
  };

  // 关闭菜单
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const goTo = (id: number) => router.push(`/novels/${slug}/read/${id}`);

  // 一键复制上下文
  const [copied, setCopied] = useState(false);
  const handleCopyContext = async () => {
    const ctx = [
      `=== 原文（第 ${chapterId} 章${analysisData?.title ? ` ${analysisData.title}` : ""}）===`,
      originalText,
      "",
      "=== 分析 ===",
      analysisData
        ? `剧情概括：${analysisData.plotSummary}\n章节定位：第${analysisData.volume}卷·${analysisData.arc}·${analysisData.position?.arcStage}\n${analysisData.position?.purpose || ""}\n${analysisContent}`
        : "（暂无分析）",
      "",
      "=== 笔记 ===",
      notesText || "（暂无笔记）",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(ctx);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* 顶部 */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-1.5 dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          第 {chapterId} 章
        </span>
        {analysisData?.title && (
          <span className="text-xs text-zinc-400">· {analysisData.title}</span>
        )}
        {analysisData && (
          <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800">
            {analysisData.position?.arcStage}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={handleCopyContext}
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="复制原文+分析+笔记"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "已复制" : "复制"}
        </button>
        {/* 全局标记词标签 */}
        {Object.entries(highlightData.terms).map(([term, cat]) => {
          const color = highlightData.categories[cat]?.color || '#FEF3C7';
          return (
            <span
              key={term}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] cursor-pointer"
              style={{ backgroundColor: color }}
              onClick={() => handleRemoveHighlight(term)}
              title={`${cat} · 点击取消`}
            >
              {term}
              <span className="opacity-50">{cat}</span>
              <X className="h-3 w-3 opacity-40" />
            </span>
          );
        })}
        <button
          onClick={() => setNotesVisible(!notesVisible)}
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {notesVisible ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
          笔记
        </button>
      </div>

      {/* 三栏（可拖拽） */}
      <Group orientation="horizontal" className="flex-1 min-h-0">
        {/* 左：原文 */}
        <Panel defaultSize={40} minSize={20}>
          <div
            className="h-full panel-scroll p-3 original-panel"
            onContextMenu={handleContextMenu}
          >
            <HighlightedText
              text={originalText}
              highlights={highlights}
              breakpoints={breakpoints}
              className="mx-auto max-w-xl whitespace-pre-wrap font-serif text-sm leading-7 text-zinc-800 dark:text-zinc-300"
            />
          </div>
        </Panel>
        <Separator className="w-1 bg-zinc-200 hover:bg-blue-400 transition-colors dark:bg-zinc-800" />

        {/* 中：分析 */}
        <Panel defaultSize={35} minSize={20}>
          <div className="h-full panel-scroll p-3">
            {analysisData ? (
              <div className="mx-auto max-w-xl space-y-3">
                <div className="space-y-2">
                  <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/30">
                    <h4 className="text-[11px] font-medium text-blue-700 dark:text-blue-400">剧情概括</h4>
                    <p className="mt-0.5 text-xs text-blue-900 dark:text-blue-300">{analysisData.plotSummary}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
                    <h4 className="text-[11px] font-medium text-zinc-500">章节定位</h4>
                    <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">第 {analysisData.volume} 卷 · {analysisData.arc} · {analysisData.position?.arcStage}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{analysisData.position?.purpose}</p>
                  </div>
                  {analysisData.characters && analysisData.characters.length > 0 && (
                    <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
                      <h4 className="text-[11px] font-medium text-zinc-500">出场人物</h4>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {analysisData.characters.map((char) => (
                          <span key={char.name} className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" title={char.scenes?.join("；")}>
                            {char.name}<span className="text-zinc-400">·</span><span className="text-zinc-500">{char.role}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysisData.relationships && analysisData.relationships.length > 0 && (
                    <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
                      <h4 className="text-[11px] font-medium text-zinc-500">人物关系</h4>
                      <div className="mt-0.5 space-y-0.5">
                        {analysisData.relationships.map((rel, i) => (
                          <p key={i} className="text-xs text-zinc-700 dark:text-zinc-300"><strong>{rel.from}</strong> → <strong>{rel.to}</strong>（{rel.type}）：{rel.development}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {(analysisData.foreshadowingPlanted?.length > 0 || analysisData.foreshadowingPayoffs?.length > 0) && (
                    <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
                      <h4 className="text-[11px] font-medium text-zinc-500">伏笔</h4>
                      {analysisData.foreshadowingPlanted?.length > 0 && (
                        <div className="mt-0.5"><span className="text-[11px] text-emerald-600">+ 铺设：</span>
                          {analysisData.foreshadowingPlanted.map((fs) => (<span key={fs.id} className="ml-1 inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{fs.id}: {fs.description}</span>))}
                        </div>
                      )}
                      {analysisData.foreshadowingPayoffs?.length > 0 && (
                        <div className="mt-0.5"><span className="text-[11px] text-orange-600">✓ 回收：</span>
                          {analysisData.foreshadowingPayoffs.map((fs) => (<span key={fs.id} className="ml-1 inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-[11px] text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{fs.id}: {fs.description}</span>))}
                        </div>
                      )}
                    </div>
                  )}
                  {analysisData.writingTechniques && analysisData.writingTechniques.length > 0 && (
                    <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
                      <h4 className="text-[11px] font-medium text-zinc-500">写作技法</h4>
                      <div className="mt-0.5 space-y-0.5">
                        {analysisData.writingTechniques.map((tech, i) => (<p key={i} className="text-xs text-zinc-700 dark:text-zinc-300"><span className="font-medium">{tech.name}</span>：{tech.example}</p>))}
                      </div>
                    </div>
                  )}
                </div>
                <MarkdownRenderer content={analysisContent} className="prose-sm" />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <p className="text-xs text-zinc-400">暂无分析</p>
                <button onClick={handleGenerateAnalysis} disabled={analysisGenerating || !originalText} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {analysisGenerating ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" />AI 分析中…</>) : (<><Sparkles className="h-3.5 w-3.5" />AI 生成分析</>)}
                </button>
                {analysisError && <p className="text-xs text-red-500">{analysisError}</p>}
              </div>
            )}
          </div>
        </Panel>
        <Separator className="w-1 bg-zinc-200 hover:bg-blue-400 transition-colors dark:bg-zinc-800" />

        {/* 右：笔记（可拖拽关闭） */}
        {notesVisible && (
          <>
            <Panel defaultSize={25} minSize={15}>
              <div className="h-full panel-scroll bg-zinc-50/50 p-3 dark:bg-zinc-950/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">笔记</h4>
                  <div className="flex items-center gap-2">
                    {saveStatus === "saving" && <span className="text-[11px] text-zinc-400">保存中…</span>}
                    {saveStatus === "saved" && <span className="flex items-center gap-1 text-[11px] text-emerald-600"><Save className="h-3 w-3" />已保存</span>}
                  </div>
                </div>
                <div data-color-mode="light">
                  <MDEditor
                    value={notesText}
                    onChange={(val) => {
                      const text = val || "";
                      setNotesText(text);
                      autoSave(text);
                    }}
                    height="calc(100vh - 10rem)"
                    preview="edit"
                    visibleDragbar={false}
                    hideToolbar={true}
                    textareaProps={{
                      placeholder: "在此编写笔记…支持 Markdown 语法和 [[wikilinks]]",
                    }}
                  />
                </div>
              </div>
            </Panel>
            <Separator className="w-1 bg-zinc-200 hover:bg-blue-400 transition-colors dark:bg-zinc-800" />
          </>
        )}
      </Group>

      {/* 底部导航 */}
      <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-1.5 dark:border-zinc-800">
        <button onClick={() => prevChapter && goTo(prevChapter)} disabled={!prevChapter} className="flex items-center gap-1 rounded px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800">
          <ChevronLeft className="h-3.5 w-3.5" />上一章
        </button>
        <span className="text-[11px] text-zinc-400">{chapterId} / {totalChapters}</span>
        <button onClick={() => nextChapter && goTo(nextChapter)} disabled={!nextChapter} className="flex items-center gap-1 rounded px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800">
          下一章<ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.selectedText ? (
            <>
              <div className="px-3 py-1.5 text-[11px] text-zinc-400 font-medium">标记为</div>
              {Object.entries(highlightData.categories).map(([cat, cfg]) => (
                <button key={cat} className="context-menu-item w-full" onClick={() => handleTagAs(cat)}>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  {cat}
                  {highlightData.terms[contextMenu.selectedText] === cat && (
                    <span className="ml-auto text-[10px] text-zinc-400">✓</span>
                  )}
                </button>
              ))}
              <div className="border-t border-zinc-100 my-1" />
              <button className="context-menu-item w-full" onClick={handleCreateTerm}>
                <Sparkles className="h-3.5 w-3.5" />
                AI 创建术语
              </button>
            </>
          ) : null}
          <button className="context-menu-item w-full" onClick={handleToggleBreakpoint}>
            <Scissors className="h-3.5 w-3.5" />
            {lineHasBreakpoint ? "取消断点" : "加入断点"}
          </button>
        </div>
      )}
    </div>
  );
}
