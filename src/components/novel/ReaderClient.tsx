"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ChapterAnalysis, ChapterNote, GrepResult } from "@/lib/types";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  BookMarked,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Sparkles,
  Loader2,
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
} | null;

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

  // 笔记面板可见性
  const [notesVisible, setNotesVisible] = useState(true);

  // 笔记编辑状态
  const [notesText, setNotesText] = useState(initialNotesContent);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // 右键菜单
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  // grep 搜索结果
  const [grepResults, setGrepResults] = useState<GrepResult[] | null>(null);
  const [grepLoading, setGrepLoading] = useState(false);

  // AI 分析生成
  const [analysisGenerating, setAnalysisGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [termGenerating, setTermGenerating] = useState(false);

  // 当切换章节时更新笔记文本
  useEffect(() => {
    setNotesText(initialNotesContent);
    setSaveStatus("idle");
    setGrepResults(null);
  }, [chapterId, initialNotesContent]);

  // 自动保存笔记（防抖 2 秒）
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

  // 原文选中文本 → 右键菜单
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selectedText || selectedText.length === 0) {
      setContextMenu(null);
      return;
    }

    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      selectedText,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  // 搜索选中词
  const handleSearchTerm = async () => {
    if (!contextMenu) return;
    const term = contextMenu.selectedText;
    closeContextMenu();
    setGrepLoading(true);
    setNotesVisible(true);

    try {
      const res = await fetch("/api/grep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, term }),
      });
      const data = await res.json();
      setGrepResults(data.results || []);
    } catch {
      setGrepResults([]);
    } finally {
      setGrepLoading(false);
    }
  };

  // AI 生成章节分析
  const handleGenerateAnalysis = async () => {
    setAnalysisGenerating(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chapter', slug, chapterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      // 刷新页面以加载新生成的分析
      router.refresh();
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '生成失败');
    } finally {
      setAnalysisGenerating(false);
    }
  };

  // AI 创建术语
  const handleCreateTerm = async () => {
    if (!contextMenu) return;
    const term = contextMenu.selectedText;
    closeContextMenu();
    setTermGenerating(true);
    try {
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'term', slug, term }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      setNotesText((prev) => prev + `\n\n术语「${term}」已生成定义，见 [[glossary/${term.replace(/[^\w一-鿿]/g, '-').toLowerCase()}]]`);
    } catch (error) {
      setNotesText((prev) => prev + `\n\n[术语生成失败：${error instanceof Error ? error.message : '未知错误'}]`);
    } finally {
      setTermGenerating(false);
    }
  };

  // 点击其他区域关闭菜单
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 导航
  const goTo = (id: number) => {
    router.push(`/novels/${slug}/read/${id}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* 顶部导航栏 */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          第 {chapterId} 章
        </span>
        {analysisData?.title && (
          <span className="text-sm text-zinc-400">· {analysisData.title}</span>
        )}
        {analysisData && (
          <span className="ml-2 inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
            {analysisData.position?.arcStage}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setNotesVisible(!notesVisible)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {notesVisible ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
          笔记
        </button>
      </div>

      {/* 三栏内容区 */}
      <div className="flex flex-1 min-h-0">
        {/* 左栏：原文 */}
        <div
          className="flex-1 panel-scroll border-r border-zinc-200 p-4 dark:border-zinc-800"
          onContextMenu={handleContextMenu}
        >
          <div className="original-text mx-auto max-w-xl whitespace-pre-wrap font-serif text-base leading-8 text-zinc-800 dark:text-zinc-300">
            {originalText || (
              <p className="text-zinc-400 italic">暂无原文（请在 original/ 目录下放置 chapter-{String(chapterId).padStart(3, "0")}.txt）</p>
            )}
          </div>
        </div>

        {/* 中栏：分析 */}
        <div className="flex-1 panel-scroll border-r border-zinc-200 p-4 dark:border-zinc-800">
          {analysisData ? (
            <div className="mx-auto max-w-xl space-y-4">
              {/* 结构化信息卡片 */}
              <div className="space-y-3">
                {/* 剧情概括 */}
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                  <h4 className="text-xs font-medium text-blue-700 dark:text-blue-400">剧情概括</h4>
                  <p className="mt-1 text-sm text-blue-900 dark:text-blue-300">{analysisData.plotSummary}</p>
                </div>

                {/* 章节位置 */}
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                  <h4 className="text-xs font-medium text-zinc-500">章节定位</h4>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    第 {analysisData.volume} 卷 · {analysisData.arc} · {analysisData.position?.arcStage}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{analysisData.position?.purpose}</p>
                </div>

                {/* 出场人物 */}
                {analysisData.characters && analysisData.characters.length > 0 && (
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                    <h4 className="text-xs font-medium text-zinc-500">出场人物</h4>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {analysisData.characters.map((char) => (
                        <span
                          key={char.name}
                          className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          title={char.scenes?.join("；")}
                        >
                          {char.name}
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-500">{char.role}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 人物关系 */}
                {analysisData.relationships && analysisData.relationships.length > 0 && (
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                    <h4 className="text-xs font-medium text-zinc-500">人物关系发展</h4>
                    <div className="mt-1 space-y-1">
                      {analysisData.relationships.map((rel, i) => (
                        <p key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                          <strong>{rel.from}</strong> → <strong>{rel.to}</strong>（{rel.type}）：{rel.development}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 伏笔 */}
                {(analysisData.foreshadowingPlanted?.length > 0 ||
                  analysisData.foreshadowingPayoffs?.length > 0) && (
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                    <h4 className="text-xs font-medium text-zinc-500">伏笔</h4>
                    {analysisData.foreshadowingPlanted?.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-emerald-600">+ 铺设：</span>
                        {analysisData.foreshadowingPlanted.map((fs) => (
                          <span
                            key={fs.id}
                            className="ml-1 inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          >
                            {fs.id}: {fs.description}
                          </span>
                        ))}
                      </div>
                    )}
                    {analysisData.foreshadowingPayoffs?.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-orange-600">✓ 回收：</span>
                        {analysisData.foreshadowingPayoffs.map((fs) => (
                          <span
                            key={fs.id}
                            className="ml-1 inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          >
                            {fs.id}: {fs.description}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 写作技法 */}
                {analysisData.writingTechniques && analysisData.writingTechniques.length > 0 && (
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                    <h4 className="text-xs font-medium text-zinc-500">写作技法</h4>
                    <div className="mt-1 space-y-1">
                      {analysisData.writingTechniques.map((tech, i) => (
                        <p key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="font-medium">{tech.name}</span>：{tech.example}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 详细分析正文 */}
              <MarkdownRenderer content={analysisContent} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-sm text-zinc-400">
                暂无分析（可在 analysis/ 目录下创建对应 Markdown 文件）
              </p>
              <button
                onClick={handleGenerateAnalysis}
                disabled={analysisGenerating || !originalText}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analysisGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 分析中…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI 生成分析
                  </>
                )}
              </button>
              {analysisError && (
                <p className="text-sm text-red-500">{analysisError}</p>
              )}
              {!originalText && (
                <p className="text-xs text-zinc-400">需要先导入原文（original/chapter-{String(chapterId).padStart(3, '0')}.txt）</p>
              )}
            </div>
          )}
        </div>

        {/* 右栏：笔记（可折叠） */}
        {notesVisible && (
          <div className="w-80 shrink-0 panel-scroll border-l border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">笔记</h4>
              <div className="flex items-center gap-2">
                {saveStatus === "saving" && <span className="text-xs text-zinc-400">保存中…</span>}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <Save className="h-3 w-3" /> 已保存
                  </span>
                )}
              </div>
            </div>

            <textarea
              value={notesText}
              onChange={handleNotesChange}
              placeholder="在此编写笔记，支持 Markdown 语法和 [[wikilinks]] 双向链接…"
              className="w-full min-h-[200px] resize-y rounded-lg border border-zinc-200 bg-white p-3 font-mono text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-600"
              style={{ height: "calc(100vh - 12rem)" }}
            />

            {/* grep 搜索结果 */}
            {grepLoading && (
              <div className="mt-3 text-sm text-zinc-400">搜索中…</div>
            )}
            {grepResults && grepResults.length > 0 && (
              <div className="mt-3 space-y-2">
                <h5 className="text-xs font-medium text-zinc-500">
                  搜索结果（{grepResults.length} 处）
                </h5>
                <div className="max-h-60 panel-scroll space-y-2">
                  {grepResults.map((r, i) => (
                    <div
                      key={i}
                      className="rounded border border-zinc-200 p-2 text-xs dark:border-zinc-700"
                    >
                      <span className="font-medium text-zinc-500">第 {r.chapterId} 章 第 {r.line} 行</span>
                      <pre className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                        {r.context}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {grepResults && grepResults.length === 0 && (
              <p className="mt-3 text-xs text-zinc-400">未找到匹配结果</p>
            )}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <button
          onClick={() => prevChapter && goTo(prevChapter)}
          disabled={!prevChapter}
          className="flex items-center gap-1 rounded px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" />
          上一章
        </button>

        <span className="text-xs text-zinc-400">
          {chapterId} / {totalChapters}
        </span>

        <button
          onClick={() => nextChapter && goTo(nextChapter)}
          disabled={!nextChapter}
          className="flex items-center gap-1 rounded px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          下一章
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-item w-full" onClick={handleSearchTerm}>
            <Search className="h-3.5 w-3.5" />
            搜索「{contextMenu.selectedText.slice(0, 15)}{contextMenu.selectedText.length > 15 ? "…" : ""}」
          </button>
          <button className="context-menu-item w-full" onClick={handleCreateTerm}>
            <Sparkles className="h-3.5 w-3.5" />
            AI 创建术语「{contextMenu.selectedText.slice(0, 12)}{contextMenu.selectedText.length > 12 ? "…" : ""}」
          </button>
        </div>
      )}
    </div>
  );
}
