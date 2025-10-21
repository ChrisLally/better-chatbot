"use server";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  createArchive,
  updateArchive,
  deleteArchive,
  addArchiveItem,
  removeArchiveItem,
  checkArchiveAccess,
} from "@/services/supabase/archive-service";
import {
  Archive,
  ArchiveItem,
  ArchiveCreateSchema,
  ArchiveUpdateSchema,
} from "app-types/archive";
import { z } from "zod";
import { revalidateTag } from "next/cache";

// ============================================================================
// ARCHIVE SERVER ACTIONS
// ============================================================================

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

    const newArchive = await createArchive({
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

    const updatedArchive = await updateArchive(archiveId, {
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

    await deleteArchive(archiveId);
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

    const newArchiveItem = await addArchiveItem(archiveId, itemId);
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

    await removeArchiveItem(archiveId, itemId);
    revalidateTag(`archive-items-${archiveId}`);
  } catch (error) {
    console.error("Error removing item from archive:", error);
    throw new Error("Failed to remove item from archive");
  }
}
