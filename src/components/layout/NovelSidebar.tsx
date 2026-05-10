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

interface NovelSidebarProps {
  slug: string;
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
];

export function NovelSidebar({ slug }: NovelSidebarProps) {
  const pathname = usePathname();

  const isActive = (sectionHref: string) => {
    const base = `/novels/${slug}`;
    if (sectionHref === "") return pathname === base;
    return pathname.startsWith(`${base}${sectionHref}`);
  };

  return (
    <aside className="w-48 shrink-0 border-r border-slate-100 bg-[#F7F7F8]">
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
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                active
                  ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
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
