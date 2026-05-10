import { notFound } from "next/navigation";
import { getNovelMeta } from "@/lib/novels";
import { Sidebar } from "@/components/layout/Sidebar";

interface NovelLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function NovelLayout({ children, params }: NovelLayoutProps) {
  const { slug } = await params;
  // Next.js 可能不自动解码中文 URL，手动解码
  const decodedSlug = decodeURIComponent(slug);
  const novel = getNovelMeta(decodedSlug);

  return (
    <div className="flex flex-1">
      <Sidebar slug={decodedSlug} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
