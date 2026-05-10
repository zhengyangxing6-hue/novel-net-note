import { notFound } from "next/navigation";
import { getNovelMeta } from "@/lib/novels";
import { NovelSidebar } from "@/components/layout/NovelSidebar";

interface NovelLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function NovelLayout({ children, params }: NovelLayoutProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const novel = getNovelMeta(decodedSlug);

  if (!novel) {
    notFound();
  }

  return (
    <div className="flex flex-1">
      <NovelSidebar slug={decodedSlug} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
