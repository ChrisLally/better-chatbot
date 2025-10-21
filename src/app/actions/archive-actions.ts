"use server";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  getArchive,
  createArchive,
  updateArchive,
  deleteArchive,
  getArchiveItems,
  addArchiveItem,
  removeArchiveItem,
  checkArchiveAccess,
  getArchivesWithItemCount,
} from "@/services/supabase/archive-service";
import {
  Archive,
  ArchiveItem,
  ArchiveCreateSchema,
  ArchiveUpdateSchema,
} from "app-types/archive";
import { z } from "zod";

// ============================================================================
// ARCHIVE SERVER ACTIONS
// ============================================================================

/**
 * Get archives for current user
 */
export async function getArchivesAction(): Promise<
  Array<Archive & { itemCount: number }>
> {
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
 * Get single archive by ID
 */
export async function getArchiveAction(
  archiveId: string,
): Promise<Archive | null> {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check access permissions
    const hasAccess = await checkArchiveAccess(archiveId, user.id);
    if (!hasAccess) {
      return null;
    }

    return await getArchive(archiveId);
  } catch (error) {
    console.error("Error fetching archive:", error);
    throw new Error("Failed to fetch archive");
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

    return await createArchive({
      name: validatedData.name,
      description: validatedData.description,
    });
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

    return await updateArchive(archiveId, {
      name: validatedUpdates.name,
      description: validatedUpdates.description,
    });
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

    return await deleteArchive(archiveId);
  } catch (error) {
    console.error("Error deleting archive:", error);
    throw new Error("Failed to delete archive");
  }
}

/**
 * Get archive items
 */
export async function getArchiveItemsAction(
  archiveId: string,
): Promise<ArchiveItem[]> {
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

    return await getArchiveItems(archiveId);
  } catch (error) {
    console.error("Error fetching archive items:", error);
    throw new Error("Failed to fetch archive items");
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

    return await addArchiveItem(archiveId, itemId);
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

    return await removeArchiveItem(archiveId, itemId);
  } catch (error) {
    console.error("Error removing item from archive:", error);
    throw new Error("Failed to remove item from archive");
  }
}
