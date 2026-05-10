import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-16 prose-a:text-blue-600 dark:prose-a:text-blue-400 ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          // 内部链接使用 next/link（通过改写 a 标签）
          a: ({ href, children, ...props }) => {
            if (href?.startsWith("/")) {
              return (
                <a href={href} {...props}>
                  {children}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
          // 表格样式优化
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table className="text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
