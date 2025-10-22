"use client";

import { DocContent } from "@/lib/docs";
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb";
import { DocsViewer } from "@/components/docs/DocsViewer";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { NotFoundPage } from "@/components/docs/NotFoundPage";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DocViewerPage() {
  const params = useParams();
  const slug = params.slug as string[];

  const [doc, setDoc] = useState<DocContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    async function fetchDoc() {
      try {
        setIsLoading(true);
        setIsNotFound(false);

        if (!slug || slug.length === 0) {
          setIsNotFound(true);
          return;
        }

        const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
        const response = await fetch(`/api/docs/${slugPath}`);

        if (!response.ok) {
          if (response.status === 404) {
            setIsNotFound(true);
          } else {
            setIsNotFound(true);
          }
          return;
        }

        const data = await response.json();
        setDoc(data);
      } catch (err) {
        console.error("Error fetching doc:", err);
        setIsNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDoc();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <DocsSidebar />
        <div className="flex-1 flex items-center justify-center bg-background text-foreground">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading documentation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="flex h-screen bg-background">
        <DocsSidebar />
        <NotFoundPage />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-screen bg-background">
        <DocsSidebar />
        <NotFoundPage />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <DocsSidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="px-8 pt-4 pb-2 border-b border-border bg-card">
          <DocsBreadcrumb slug={doc.slug} />
        </div>
        <DocsViewer doc={doc} />
      </div>
    </div>
  );
}
