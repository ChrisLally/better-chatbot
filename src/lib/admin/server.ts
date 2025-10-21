import "server-only";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { AdminUsersQuery, AdminUsersPaginated } from "app-types/admin";
import {
  requireAdminPermission,
  requireUserListPermission,
} from "lib/auth/permissions";
import pgAdminRepository from "lib/db/pg/repositories/admin-respository.pg";

export const ADMIN_USER_LIST_LIMIT = 10;
export const DEFAULT_SORT_BY = "createdAt";
export const DEFAULT_SORT_DIRECTION = "desc";

/**
 * Require an admin session
 * This is a wrapper around the getSupabaseUser function
 * that throws an error if the user is not an admin
 *
 * @deprecated Use requireAdminPermission() from lib/auth/permissions instead
 */
export async function requireAdminSession(): Promise<
  NonNullable<Awaited<ReturnType<typeof getSupabaseUser>>>
> {
  const user = await getSupabaseUser();

  if (!user) {
    throw new Error("Unauthorized: No session found");
  }

  // Use our new permission system internally
  await requireAdminPermission("access admin functions");

  return user;
}

/**
 * Get paginated users using our custom repository with improved search capabilities
 * Only admins can list and search users
 */
export async function getAdminUsers(
  query?: AdminUsersQuery,
): Promise<AdminUsersPaginated> {
  // Use our new permission system
  await requireUserListPermission("list users in admin panel");

  try {
    // TODO: Implement proper search/sort/pagination with Supabase
    // For now, use basic getUsers and do pagination in memory
    const { getUsers } = await import("@/services/supabase/users-service");
    const allUsers = await getUsers();

    const limit = query?.limit ?? ADMIN_USER_LIST_LIMIT;
    const offset = query?.offset ?? 0;

    // Simple pagination
    const paginatedUsers = allUsers.slice(offset, offset + limit);

    return {
      users: paginatedUsers,
      total: allUsers.length,
    };
  } catch (error) {
    console.error("Error getting admin users", error);
    throw error;
  }
}
