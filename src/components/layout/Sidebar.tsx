"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "书库大厅" },
  { href: "/recent", label: "最近阅读" },
  { href: "/notes", label: "我的笔记" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-[#F7F7F8] border-r border-slate-100 h-screen flex flex-col transition-all shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-8 mb-6 mt-2">
        <h1 className="text-xl font-semibold text-slate-800 tracking-wider">
          Net<span className="text-slate-400">Note</span>
        </h1>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-4 space-y-1">
        {navLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                active
                  ? "text-slate-900 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* 底部设置 */}
      <div className="p-4 mb-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all"
        >
          设置
        </Link>
      </div>
    </aside>
  );
}
