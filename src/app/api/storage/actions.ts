"use server";

import {
  getStorageInfo,
  checkStorageConfiguration,
} from "@/services/supabase/storage-service";

/**
 * Get storage configuration info.
 * Used by clients to determine upload strategy.
 */
export async function getStorageInfoAction() {
  return await getStorageInfo();
}

/**
 * Check if storage is properly configured.
 * Returns detailed error messages with solutions.
 */
export async function checkStorageAction() {
  return await checkStorageConfiguration();
}
