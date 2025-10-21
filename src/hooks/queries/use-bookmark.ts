"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { toggleBookmarkAction } from "@/app/actions/bookmark-actions";

export interface BookmarkItem {
  id: string;
  isBookmarked?: boolean;
}

interface UseBookmarkOptions {
  itemType?: "agent" | "workflow" | "mcp";
}

export function useBookmark(options: UseBookmarkOptions = {}) {
  const { itemType = "agent" } = options;
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const { mutate } = useSWRConfig();

  const toggleBookmark = async (item: BookmarkItem) => {
    const { id, isBookmarked = false } = item;

    if (loadingIds.has(id)) return;

    setLoadingIds((prev) => new Set(prev).add(id));

    try {
      // Use server action instead of direct API call
      const result = await toggleBookmarkAction({
        itemId: id,
        itemType,
        isCurrentlyBookmarked: isBookmarked,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update bookmark");
      }

      // Update all list caches with optimistic data
      await mutate(
        (key) => {
          if (typeof key !== "string") return false;
          // Update agent list cache keys (agents-{filters}-{limit}) but not individual items
          if (itemType === "agent") {
            return key.startsWith("agents-");
          }
          // For other item types, keep the original pattern
          return (
            key.startsWith(`/api/${itemType}`) &&
            !key.match(new RegExp(`/api/${itemType}/[^/?]+$`))
          );
        },
        (cachedData: any) => {
          if (!cachedData) return cachedData;

          // Handle arrays of items (like agents-{filters}-{limit})
          if (Array.isArray(cachedData)) {
            return cachedData.map((item: any) =>
              item.id === id
                ? { ...item, isBookmarked: result.isBookmarked }
                : item,
            );
          }

          // Handle single item objects (like some search endpoints)
          if (cachedData.id === id) {
            return { ...cachedData, isBookmarked: result.isBookmarked };
          }

          return cachedData;
        },
        { revalidate: true },
      );

      // Also update individual item cache
      await mutate(
        itemType === "agent" ? `agent-${id}` : `/api/${itemType}/${id}`,
        (cachedData: any) => {
          if (!cachedData) return cachedData;
          return { ...cachedData, isBookmarked: result.isBookmarked };
        },
        { revalidate: true },
      );

      return result.isBookmarked; // Return new bookmark state
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      throw error;
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return {
    toggleBookmark,
    isLoading: (itemId: string) => loadingIds.has(itemId),
  };
}
