"use client";

import { DocsIndex } from "@/lib/docs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function DocsSidebar() {
  const pathname = usePathname();
  const [index, setIndex] = useState<DocsIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    async function fetchIndex() {
      try {
        const response = await fetch("/api/docs");
        if (response.ok) {
          const data = await response.json();
          setIndex(data);

          // Extract current category from pathname and auto-expand
          const pathParts = pathname.split("/");
          if (pathParts.length >= 3) {
            const category = pathParts[2];
            setExpandedCategories(new Set([category]));
          }
        }
      } catch (error) {
        console.error("Error fetching docs index:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchIndex();
  }, [pathname]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) {
    return <div className="p-4">Loading navigation...</div>;
  }

  if (!index) {
    return <div className="p-4">Failed to load navigation</div>;
  }

  return (
    <nav className="w-64 border-r border-border p-4 max-h-screen overflow-y-auto bg-card">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        Documentation
      </h2>

      <div className="space-y-2">
        {Object.entries(index.structure).map(([category, docs]) => (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full text-left font-semibold text-sm py-2 px-2 rounded hover:bg-accent/10 text-foreground transition"
            >
              {category}
            </button>

            {expandedCategories.has(category) && (
              <div className="ml-4 space-y-1">
                {docs.map((doc) => (
                  <Link
                    key={doc.path}
                    href={`/docs/${doc.path}`}
                    className={`block text-sm py-1 px-2 rounded truncate transition ${
                      pathname === `/docs/${doc.path}`
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                    }`}
                  >
                    {doc.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
