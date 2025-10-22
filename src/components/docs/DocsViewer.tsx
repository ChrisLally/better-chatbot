"use client";

import { DocContent } from "@/lib/docs";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocsViewerProps {
  doc: DocContent;
}

/**
 * Custom link renderer that handles internal doc links
 * Converts internal doc links to Next.js Link components for SPA navigation
 */
function CustomLink({
  href,
  children,
  ...props
}: React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>) {
  if (!href) {
    return <a {...props}>{children}</a>;
  }

  // Check if it's an internal doc link
  const isInternalDoc =
    href.startsWith("/docs/") || href.startsWith("docs/") || href === "/docs";

  if (isInternalDoc) {
    // Normalize the path
    const normalizedHref = href.startsWith("/docs/")
      ? href
      : `/docs/${href.replace(/^docs\//, "")}`;

    return (
      <Link href={normalizedHref} className="text-primary hover:underline">
        {children}
      </Link>
    );
  }

  // External link
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  );
}

export function DocsViewer({ doc }: DocsViewerProps) {
  return (
    <article className="flex-1 overflow-y-auto p-8 bg-background text-foreground">
      <div className="prose dark:prose-invert max-w-none">
        <h1>{doc.title}</h1>

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: CustomLink as any,
            code: ({ inline, className, children, ...props }: any) => {
              if (inline) {
                return (
                  <code
                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded font-mono text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              // For code blocks (not inline), return just the code element
              // The pre element is handled by the pre component
              // Ensure good contrast with light text on dark background
              return (
                <code className="text-gray-100 font-mono text-sm" {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }: any) => (
              <pre className="bg-slate-900 text-gray-100 p-4 rounded overflow-x-auto border border-slate-700 my-4">
                {children}
              </pre>
            ),
            table: ({ children }: any) => (
              <table className="border-collapse border border-border w-full my-4">
                {children}
              </table>
            ),
            th: ({ children }: any) => (
              <th className="border border-border p-3 bg-muted text-muted-foreground text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }: any) => (
              <td className="border border-border p-3 text-foreground">
                {children}
              </td>
            ),
          }}
        >
          {doc.content}
        </ReactMarkdown>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-12 pt-8 border-t border-border">
        {doc.prevDoc ? (
          <Link
            href={`/docs/${doc.prevDoc.path}`}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent transition"
          >
            ← Previous: {doc.prevDoc.title}
          </Link>
        ) : (
          <div />
        )}

        {doc.nextDoc ? (
          <Link
            href={`/docs/${doc.nextDoc.path}`}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent transition"
          >
            Next: {doc.nextDoc.title} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </article>
  );
}
