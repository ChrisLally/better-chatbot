import "server-only";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/supabase";

type BookmarkRow = Tables<"bookmark">;

export interface Bookmark {
  id: string;
  userId: string;
  itemId: string;
  itemType: "agent" | "workflow" | "mcp";
  createdAt: string;
}

export interface BookmarkItem {
  id: string;
  isBookmarked?: boolean;
}

/**
 * Create a new bookmark
 */
export async function createBookmark(
  userId: string,
  itemId: string,
  itemType: "agent" | "workflow" | "mcp",
): Promise<void> {
  // Verify the user can only bookmark items they have access to
  const hasAccess = await checkItemAccess(itemId, itemType, userId);
  if (!hasAccess) {
    throw new Error("Item not found or access denied");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("bookmark").insert({
    user_id: userId,
    item_id: itemId,
    item_type: itemType,
  });

  if (error) {
    // Handle unique constraint violation (already bookmarked)
    if (error.code === "23505") {
      throw new Error("Item is already bookmarked");
    }
    console.error("Error creating bookmark:", error);
    throw new Error("Failed to create bookmark");
  }
}

/**
 * Remove a bookmark
 */
export async function removeBookmark(
  userId: string,
  itemId: string,
  itemType: "agent" | "workflow" | "mcp",
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookmark")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("item_type", itemType);

  if (error) {
    console.error("Error removing bookmark:", error);
    throw new Error("Failed to remove bookmark");
  }
}

/**
 * Toggle bookmark status (create if doesn't exist, remove if exists)
 */
export async function toggleBookmark(
  userId: string,
  itemId: string,
  itemType: "agent" | "workflow" | "mcp",
  isCurrentlyBookmarked: boolean,
): Promise<boolean> {
  try {
    if (isCurrentlyBookmarked) {
      await removeBookmark(userId, itemId, itemType);
      return false; // No longer bookmarked
    } else {
      await createBookmark(userId, itemId, itemType);
      return true; // Now bookmarked
    }
  } catch (error) {
    // If bookmark creation fails due to already existing, remove it instead
    if (
      error instanceof Error &&
      error.message === "Item is already bookmarked"
    ) {
      await removeBookmark(userId, itemId, itemType);
      return false;
    }
    throw error;
  }
}

/**
 * Get all bookmarks for a user
 */
export async function getBookmarks(
  userId: string,
  itemType?: "agent" | "workflow" | "mcp",
): Promise<Bookmark[]> {
  const supabase = await createClient();

  let query = supabase
    .from("bookmark")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bookmarks:", error);
    throw new Error("Failed to fetch bookmarks");
  }

  return (data || []).map((row: BookmarkRow) => ({
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    itemType: row.item_type as "agent" | "workflow" | "mcp",
    createdAt: row.created_at,
  }));
}

/**
 * Check if an item is bookmarked by a user
 */
export async function checkBookmark(
  userId: string,
  itemId: string,
  itemType: "agent" | "workflow" | "mcp",
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookmark")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return false;
    }
    console.error("Error checking bookmark:", error);
    throw new Error("Failed to check bookmark");
  }

  return !!data;
}

/**
 * Check if user has access to bookmark an item
 * For agents: check if agent exists and is accessible
 * For workflows: check if workflow exists and is accessible
 * For mcp: check if MCP server exists and is accessible
 */
export async function checkItemAccess(
  itemId: string,
  itemType: "agent" | "workflow" | "mcp",
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();

  if (itemType === "agent") {
    // Check if agent exists and user has access
    const { data: agent, error } = await supabase
      .from("users")
      .select("id, visibility, user_id")
      .eq("id", itemId)
      .eq("user_type", "agent")
      .single();

    if (error || !agent) {
      return false;
    }

    // Check access based on visibility and ownership
    if (agent.visibility === "public") {
      return true;
    }

    if (agent.user_id === userId) {
      return true;
    }

    // For private/readonly agents, only owner can bookmark
    return agent.user_id === userId;
  }

  if (itemType === "workflow") {
    // Check if workflow exists and user has access
    const { data: workflow, error } = await supabase
      .from("workflows")
      .select("id, user_id, visibility")
      .eq("id", itemId)
      .single();

    if (error || !workflow) {
      return false;
    }

    // Check access based on visibility and ownership
    if (workflow.visibility === "public") {
      return true;
    }

    if (workflow.user_id === userId) {
      return true;
    }

    // For private/readonly workflows, only owner can bookmark
    return workflow.user_id === userId;
  }

  if (itemType === "mcp") {
    // Check if MCP server exists and user has access
    const { data: mcpServer, error } = await supabase
      .from("mcp_server")
      .select("id, user_id, visibility")
      .eq("id", itemId)
      .single();

    if (error || !mcpServer) {
      return false;
    }

    // Check access based on visibility and ownership
    if (mcpServer.visibility === "public") {
      return true;
    }

    if (mcpServer.user_id === userId) {
      return true;
    }

    // For private MCP servers, only owner can bookmark
    return mcpServer.user_id === userId;
  }

  return false;
}
