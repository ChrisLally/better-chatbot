import "server-only";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { AdminUsersQuery, AdminUsersPaginated } from "app-types/admin";
import {
  requireAdminPermission,
  requireUserListPermission,
} from "lib/auth/permissions";

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

    // Transform users to AdminUserListItem format
    const transformedUsers = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: false, // TODO: Add email verification status
      image: user.image,
      role: null, // TODO: Add role information
      banned: false, // TODO: Add ban status
      banReason: null,
      banExpires: null,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
      lastLogin: null, // TODO: Add last login tracking
    }));

    // Simple pagination
    const paginatedUsers = transformedUsers.slice(offset, offset + limit);

    return {
      users: paginatedUsers,
      total: allUsers.length,
      limit,
      offset,
    };
  } catch (error) {
    console.error("Error getting admin users", error);
    throw error;
  }
}
