"use client";

import Link from "next/link";

interface DocsBreadcrumbProps {
  slug: string[];
}

export function DocsBreadcrumb({ slug }: DocsBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
      <Link href="/docs" className="hover:text-foreground transition">
        Docs
      </Link>

      {slug.map((part, index) => {
        const path = slug.slice(0, index + 1).join("/");
        const isLast = index === slug.length - 1;

        return (
          <div key={path} className="flex items-center gap-2">
            <span className="text-border">/</span>
            {isLast ? (
              <span className="text-foreground font-semibold">{part}</span>
            ) : (
              <Link
                href={`/docs/${path}`}
                className="hover:text-foreground transition"
              >
                {part}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
