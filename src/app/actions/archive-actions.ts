"use server";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  createArchive,
  updateArchive,
  deleteArchive,
  addArchiveItem,
  removeArchiveItem,
  checkArchiveAccess,
  getArchivesWithItemCount,
} from "@/services/supabase/archive-service";
import {
  Archive,
  ArchiveItem,
  ArchiveWithItemCount,
  ArchiveCreateSchema,
  ArchiveUpdateSchema,
} from "app-types/archive";
import { z } from "zod";
import { revalidateTag } from "next/cache";

// ============================================================================
// ARCHIVE SERVER ACTIONS
// ============================================================================

/**
 * Get all archives for the current user with item counts
 */
export async function getArchivesAction(): Promise<ArchiveWithItemCount[]> {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    return await getArchivesWithItemCount(user.id);
  } catch (error) {
    console.error("Error fetching archives:", error);
    throw new Error("Failed to fetch archives");
  }
}

/**
 * Create new archive
 */
export async function createArchiveAction(
  data: z.infer<typeof ArchiveCreateSchema>,
): Promise<Archive> {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Validate input
    const validatedData = ArchiveCreateSchema.parse(data);

    const newArchive = await createArchive(user.id, {
      name: validatedData.name,
      description: validatedData.description,
    });
    revalidateTag("archives");
    return newArchive;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${error.message}`);
    }
    console.error("Error creating archive:", error);
    throw new Error("Failed to create archive");
  }
}

/**
 * Update archive
 */
export async function updateArchiveAction(
  archiveId: string,
  updates: z.infer<typeof ArchiveUpdateSchema>,
): Promise<Archive> {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check access permissions
    const hasAccess = await checkArchiveAccess(archiveId, user.id);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Validate input
    const validatedUpdates = ArchiveUpdateSchema.parse(updates);

    const updatedArchive = await updateArchive(user.id, archiveId, {
      name: validatedUpdates.name,
      description: validatedUpdates.description,
    });
    revalidateTag("archives");
    revalidateTag(`archive-${archiveId}`);
    return updatedArchive;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${error.message}`);
    }
    console.error("Error updating archive:", error);
    throw new Error("Failed to update archive");
  }
}

/**
 * Delete archive
 */
export async function deleteArchiveAction(archiveId: string): Promise<void> {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check access permissions
    const hasAccess = await checkArchiveAccess(archiveId, user.id);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    await deleteArchive(user.id, archiveId);
    revalidateTag("archives");
    revalidateTag(`archive-${archiveId}`);
  } catch (error) {
    console.error("Error deleting archive:", error);
    throw new Error("Failed to delete archive");
  }
}

/**
 * Add item to archive
 */
export async function addArchiveItemAction(
  archiveId: string,
  itemId: string,
): Promise<ArchiveItem> {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check access permissions
    const hasAccess = await checkArchiveAccess(archiveId, user.id);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const newArchiveItem = await addArchiveItem(user.id, archiveId, itemId);
    revalidateTag(`archive-items-${archiveId}`);
    return newArchiveItem;
  } catch (error) {
    console.error("Error adding item to archive:", error);
    throw new Error("Failed to add item to archive");
  }
}

/**
 * Remove item from archive
 */
export async function removeArchiveItemAction(
  archiveId: string,
  itemId: string,
): Promise<void> {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check access permissions
    const hasAccess = await checkArchiveAccess(archiveId, user.id);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    await removeArchiveItem(user.id, archiveId, itemId);
    revalidateTag(`archive-items-${archiveId}`);
  } catch (error) {
    console.error("Error removing item from archive:", error);
    throw new Error("Failed to remove item from archive");
  }
}
