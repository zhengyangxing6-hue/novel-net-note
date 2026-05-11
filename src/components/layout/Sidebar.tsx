"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  GitBranch,
  List,
  Eye,
  Users,
  BookMarked,
  Lightbulb,
  FileText,
} from "lucide-react";

interface SidebarProps {
  slug: string;
  chapterCount?: number;
}

const sections = [
  { href: "", label: "总览", icon: BookOpen },
  { href: "/structure", label: "结构", icon: GitBranch },
  { href: "/chapters", label: "章节", icon: List },
  { href: "/foreshadowing", label: "伏笔", icon: Eye },
  { href: "/characters", label: "人物", icon: Users },
  { href: "/glossary", label: "术语", icon: BookMarked },
  { href: "/events", label: "事件", icon: Lightbulb },
  { href: "/summary", label: "总结", icon: FileText },
  { href: "/prompts", label: "提示词", icon: Lightbulb },
];

export function Sidebar({ slug }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (sectionHref: string) => {
    const base = `/novels/${slug}`;
    if (sectionHref === "") {
      return pathname === base;
    }
    return pathname.startsWith(`${base}${sectionHref}`);
  };

  return (
    <aside className="w-48 shrink-0 border-r border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50">
      <nav className="flex flex-col gap-0.5 p-3">
        {sections.map((section) => {
          const active = isActive(section.href);
          const Icon = section.icon;
          const href = section.href
            ? `/novels/${slug}${section.href}`
            : `/novels/${slug}`;

          return (
            <Link
              key={section.href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{section.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
