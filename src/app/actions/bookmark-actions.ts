"use server";

import { z } from "zod";
import { revalidateTag, revalidatePath } from "next/cache";
import {
  createBookmark,
  removeBookmark,
  toggleBookmark,
  getBookmarks,
  checkBookmark,
  checkItemAccess,
  type Bookmark,
} from "@/services/supabase/bookmark-service";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";

// Zod validation schemas
const BookmarkInputSchema = z.object({
  itemId: z.string().min(1),
  itemType: z.enum(["agent", "workflow", "mcp"]),
});

const ToggleBookmarkInputSchema = z.object({
  itemId: z.string().min(1),
  itemType: z.enum(["agent", "workflow", "mcp"]),
  isCurrentlyBookmarked: z.boolean(),
});

/**
 * Server action to create a bookmark
 */
export async function createBookmarkAction(
  input: z.infer<typeof BookmarkInputSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const { itemId, itemType } = BookmarkInputSchema.parse(input);

    await createBookmark(currentUser.id, itemId, itemType);

    // Revalidate relevant caches
    revalidateTag(`bookmarks-${currentUser.id}`);
    revalidateTag(`${itemType}s`);
    revalidatePath(`/${itemType}s`);

    return { success: true };
  } catch (error) {
    console.error("Error creating bookmark:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create bookmark",
    };
  }
}

/**
 * Server action to remove a bookmark
 */
export async function removeBookmarkAction(
  input: z.infer<typeof BookmarkInputSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const { itemId, itemType } = BookmarkInputSchema.parse(input);

    await removeBookmark(currentUser.id, itemId, itemType);

    // Revalidate relevant caches
    revalidateTag(`bookmarks-${currentUser.id}`);
    revalidateTag(`${itemType}s`);
    revalidatePath(`/${itemType}s`);

    return { success: true };
  } catch (error) {
    console.error("Error removing bookmark:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove bookmark",
    };
  }
}

/**
 * Server action to toggle bookmark status
 */
export async function toggleBookmarkAction(
  input: z.infer<typeof ToggleBookmarkInputSchema>,
): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      return { success: false, isBookmarked: false, error: "Unauthorized" };
    }

    const { itemId, itemType, isCurrentlyBookmarked } =
      ToggleBookmarkInputSchema.parse(input);

    const newBookmarkState = await toggleBookmark(
      currentUser.id,
      itemId,
      itemType,
      isCurrentlyBookmarked,
    );

    // Revalidate relevant caches
    revalidateTag(`bookmarks-${currentUser.id}`);
    revalidateTag(`${itemType}s`);
    revalidatePath(`/${itemType}s`);

    return { success: true, isBookmarked: newBookmarkState };
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return {
      success: false,
      isBookmarked: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle bookmark",
    };
  }
}

/**
 * Server action to get all bookmarks for a user
 */
export async function getBookmarksAction(
  itemType?: "agent" | "workflow",
): Promise<{ success: boolean; bookmarks?: Bookmark[]; error?: string }> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const bookmarks = await getBookmarks(currentUser.id, itemType);

    return { success: true, bookmarks };
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch bookmarks",
    };
  }
}

/**
 * Server action to check if an item is bookmarked
 */
export async function checkBookmarkAction(
  input: z.infer<typeof BookmarkInputSchema>,
): Promise<{ success: boolean; isBookmarked?: boolean; error?: string }> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const { itemId, itemType } = BookmarkInputSchema.parse(input);

    const isBookmarked = await checkBookmark(currentUser.id, itemId, itemType);

    return { success: true, isBookmarked };
  } catch (error) {
    console.error("Error checking bookmark:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check bookmark",
    };
  }
}

/**
 * Server action to check if user has access to bookmark an item
 */
export async function checkItemAccessAction(
  input: z.infer<typeof BookmarkInputSchema>,
): Promise<{ success: boolean; hasAccess?: boolean; error?: string }> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const { itemId, itemType } = BookmarkInputSchema.parse(input);

    const hasAccess = await checkItemAccess(itemId, itemType, currentUser.id);

    return { success: true, hasAccess };
  } catch (error) {
    console.error("Error checking item access:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check item access",
    };
  }
}
