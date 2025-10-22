import "server-only";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/supabase";
import { Archive, ArchiveItem } from "app-types/archive";

export type User = Tables<"users">;
type ArchiveRow = Tables<"archive">;
type ArchiveItemRow = Tables<"archive_item">;

// ============================================================================
// ARCHIVE FUNCTIONS
// ============================================================================

/**
 * Convert archive row to Archive type
 */
function archiveRowToArchive(row: ArchiveRow): Archive {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  } as Archive;
}

/**
 * Convert archive item row to ArchiveItem type
 */
function archiveItemRowToArchiveItem(row: ArchiveItemRow): ArchiveItem {
  return {
    id: row.id,
    archiveId: row.archive_id,
    itemId: row.item_id,
    userId: row.user_id,
    addedAt: new Date(row.added_at),
  };
}

/**
 * Get all archives for a user
 */
export async function getArchives(userId: string): Promise<Archive[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("archive")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching archives:", error);
    throw new Error("Failed to fetch archives");
  }

  return (data || []).map(archiveRowToArchive);
}

/**
 * Get single archive by ID
 */
export async function getArchive(archiveId: string): Promise<Archive | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("archive")
    .select("*")
    .eq("id", archiveId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Archive not found
    }
    console.error("Error fetching archive:", error);
    throw new Error("Failed to fetch archive");
  }

  return archiveRowToArchive(data);
}

/**
 * Create new archive
 */
export async function createArchive(
  userId: string,
  data: {
    name: string;
    description?: string | null;
  },
): Promise<Archive> {
  const supabase = await createClient();

  const { data: archive, error } = await supabase
    .from("archive")
    .insert({
      name: data.name,
      description: data.description,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating archive:", error);
    throw new Error("Failed to create archive");
  }

  return archiveRowToArchive(archive);
}

/**
 * Update archive
 */
export async function updateArchive(
  userId: string,
  archiveId: string,
  updates: {
    name?: string;
    description?: string | null;
  },
): Promise<Archive> {
  const supabase = await createClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;

  const { data, error } = await supabase
    .from("archive")
    .update(updateData)
    .eq("id", archiveId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating archive:", error);
    throw new Error("Failed to update archive");
  }

  return archiveRowToArchive(data);
}

/**
 * Delete archive
 */
export async function deleteArchive(
  userId: string,
  archiveId: string,
): Promise<void> {
  const supabase = await createClient();

  // First delete all archive items
  await supabase.from("archive_item").delete().eq("archive_id", archiveId);

  // Then delete the archive
  const { error } = await supabase
    .from("archive")
    .delete()
    .eq("id", archiveId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting archive:", error);
    throw new Error("Failed to delete archive");
  }
}

/**
 * Get archive items
 */
export async function getArchiveItems(
  userId: string,
  archiveId: string,
): Promise<ArchiveItem[]> {
  const supabase = await createClient();

  // First verify archive exists and user owns it
  const { data: archive } = await supabase
    .from("archive")
    .select("id")
    .eq("id", archiveId)
    .eq("user_id", userId)
    .single();

  if (!archive) {
    throw new Error("Archive not found or access denied");
  }

  const { data, error } = await supabase
    .from("archive_item")
    .select("*")
    .eq("archive_id", archiveId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching archive items:", error);
    throw new Error("Failed to fetch archive items");
  }

  return (data || []).map(archiveItemRowToArchiveItem);
}

/**
 * Add item to archive
 */
export async function addArchiveItem(
  userId: string,
  archiveId: string,
  itemId: string,
): Promise<ArchiveItem> {
  const supabase = await createClient();

  // First verify archive exists and user owns it
  const { data: archive } = await supabase
    .from("archive")
    .select("id")
    .eq("id", archiveId)
    .eq("user_id", userId)
    .single();

  if (!archive) {
    throw new Error("Archive not found or access denied");
  }

  // Check if item already exists in archive
  const { data: existingItem } = await supabase
    .from("archive_item")
    .select("id")
    .eq("archive_id", archiveId)
    .eq("item_id", itemId)
    .single();

  if (existingItem) {
    throw new Error("Item already exists in archive");
  }

  const { data, error } = await supabase
    .from("archive_item")
    .insert({
      archive_id: archiveId,
      item_id: itemId,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error adding item to archive:", error);
    throw new Error("Failed to add item to archive");
  }

  return archiveItemRowToArchiveItem(data);
}

/**
 * Remove item from archive
 */
export async function removeArchiveItem(
  userId: string,
  archiveId: string,
  itemId: string,
): Promise<void> {
  const supabase = await createClient();

  // First verify archive exists and user owns it
  const { data: archive } = await supabase
    .from("archive")
    .select("id")
    .eq("id", archiveId)
    .eq("user_id", userId)
    .single();

  if (!archive) {
    throw new Error("Archive not found or access denied");
  }

  const { error } = await supabase
    .from("archive_item")
    .delete()
    .eq("archive_id", archiveId)
    .eq("item_id", itemId);

  if (error) {
    console.error("Error removing item from archive:", error);
    throw new Error("Failed to remove item from archive");
  }
}

/**
 * Check if user has access to archive
 */
export async function checkArchiveAccess(
  archiveId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("archive")
    .select("id")
    .eq("id", archiveId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false; // Archive not found or no access
    }
    console.error("Error checking archive access:", error);
    throw new Error("Failed to check archive access");
  }

  return !!data;
}

/**
 * Get archives with item counts
 */
export async function getArchivesWithItemCount(
  userId: string,
): Promise<Array<Archive & { itemCount: number }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("archive")
    .select(`
      *,
      archive_item(count)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching archives with item count:", error);
    throw new Error("Failed to fetch archives");
  }

  return (data || []).map((row: any) => ({
    ...archiveRowToArchive(row),
    itemCount: row.archive_item?.[0]?.count || 0,
  }));
}
