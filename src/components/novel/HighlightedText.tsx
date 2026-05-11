"use client";

import { useMemo } from "react";

interface HighlightedTextProps {
  text: string;
  highlights: Map<string, string>;   // 词 → 颜色
  breakpoints: Set<number>;           // 行号集合
  className?: string;
}

const BREAKPOINT_MARK = "— — — — — — — — — —";

/**
 * 将原文按高亮词拆分渲染，支持断点标记。
 */
export function HighlightedText({
  text,
  highlights,
  breakpoints,
  className,
}: HighlightedTextProps) {
  const lines = useMemo(() => text.split("\n"), [text]);

  // 构建按行渲染的内容，包含高亮和断点
  const rendered = useMemo(() => {
    if (highlights.size === 0 && breakpoints.size === 0) {
      return null; // 无需处理，直接渲染原文
    }

    const highlightTerms = Array.from(highlights.keys());

    return lines.map((line, lineIdx) => {
      const lineNum = lineIdx + 1;
      const hasBreakpoint = breakpoints.has(lineNum);

      // 对该行做高亮分词
      const segments = splitByTerms(line, highlightTerms);

      return (
        <div key={lineIdx}>
          <span>
            {segments.map((seg, i) => (
              <span
                key={i}
                style={
                  seg.term
                    ? { backgroundColor: highlights.get(seg.term) ?? undefined }
                    : undefined
                }
              >
                {seg.text}
              </span>
            ))}
          </span>
          {hasBreakpoint && (
            <div className="my-2 text-center text-xs text-slate-300 select-none tracking-[0.5em]">
              {BREAKPOINT_MARK}
            </div>
          )}
        </div>
      );
    });
  }, [lines, highlights, breakpoints]);

  // 没有高亮和断点时，直接渲染纯文本
  if (!rendered) {
    return (
      <div className={className}>
        {text || (
          <p className="text-zinc-400 italic">暂无原文</p>
        )}
      </div>
    );
  }

  return <div className={className}>{rendered}</div>;
}

interface TextSegment {
  text: string;
  term: string | null;  // 匹配到的词，null 表示普通文本
}

/**
 * 将一行文本按多个搜索词拆分为片段。
 * 后出现的词优先（防止嵌套时颜色覆盖混乱）。
 */
function splitByTerms(line: string, terms: string[]): TextSegment[] {
  if (terms.length === 0) return [{ text: line, term: null }];

  // 找出所有匹配位置
  interface Match { start: number; end: number; term: string }
  const matches: Match[] = [];

  for (const term of terms) {
    let idx = 0;
    while (idx < line.length) {
      const pos = line.indexOf(term, idx);
      if (pos === -1) break;
      matches.push({ start: pos, end: pos + term.length, term });
      idx = pos + 1;
    }
  }

  if (matches.length === 0) return [{ text: line, term: null }];

  // 按位置排序，重叠时后匹配的优先
  matches.sort((a, b) => a.start - b.start);

  // 去重叠：保留后出现的词，移除被覆盖的
  const filtered: Match[] = [];
  for (const m of matches) {
    // 移除被 m 覆盖的已有匹配
    while (
      filtered.length > 0 &&
      filtered[filtered.length - 1].end > m.start
    ) {
      filtered.pop();
    }
    filtered.push(m);
  }

  // 构建片段
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor) {
      segments.push({ text: line.slice(cursor, m.start), term: null });
    }
    segments.push({ text: line.slice(m.start, m.end), term: m.term });
    cursor = m.end;
  }
  if (cursor < line.length) {
    segments.push({ text: line.slice(cursor), term: null });
  }

  return segments;
}
