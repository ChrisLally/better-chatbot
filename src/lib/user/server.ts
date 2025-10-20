"use server";

import { BasicUserWithLastLogin, UserPreferences } from "app-types/user";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { getUser as getUserFromService } from "@/services/supabase/users-service";
import { notFound } from "next/navigation";
import { customModelProvider } from "@/lib/ai/models";

// Helper function to get model provider from model name
const getModelProvider = (modelName: string): string => {
  for (const { provider, models } of customModelProvider.modelsInfo) {
    for (const model of models) {
      if (model.name === modelName) {
        return provider;
      }
    }
  }
  return "unknown";
};

/**
 * Get the user by id
 * We can only get the user by id for the current user as a non-admin user
 * We can get the user by id for any user as an admin user
 */
export async function getUser(
  userId?: string,
): Promise<BasicUserWithLastLogin | null> {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  const user = await getUserFromService(resolvedUserId);
  if (!user) return null;

  // Convert User type to BasicUserWithLastLogin type
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    user_type: user.user_type,
    created_at: user.created_at,
    updated_at: user.updated_at,
    lastLogin: null, // Not available in users table yet
    role: null, // Not available in users table yet
    banned: null, // Not available in users table yet
  };
}

/**
 * Get user accounts
 * We can only list accounts for the current user as a non-admin user
 * We can list accounts for any user as an admin user
 */
export async function getUserAccounts(userId?: string) {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  const supabase = await createClient();

  // Get user identities from Supabase Auth
  const {
    data: { user },
    error,
  } = await supabase.auth.admin.getUserById(resolvedUserId);

  if (error || !user) {
    return { accounts: [], hasPassword: false, oauthProviders: [] };
  }

  // Transform Supabase identities to match the old format
  const accounts =
    user.identities?.map((identity) => ({
      id: identity.id,
      userId: user.id,
      providerId:
        identity.provider === "email" ? "credential" : identity.provider,
      accountId: identity.identity_data?.sub || identity.id,
    })) || [];

  const hasPassword = accounts.some(
    (account) => account.providerId === "credential",
  );
  const oauthProviders = accounts
    .filter((account) => account.providerId !== "credential")
    .map((account) => account.providerId);
  return { accounts, hasPassword, oauthProviders };
}

/**
 * List user sessions
 * We use Supabase Auth to list the sessions
 * We can only list sessions for the current user as a non-admin user
 * We can list sessions for any user as an admin user
 *
 * Note: Supabase Auth doesn't expose session listing via the API.
 * Sessions are managed internally by Supabase and accessed via cookies/tokens.
 */
export async function getUserSessions(userId?: string): Promise<any[]> {
  await getUserIdAndCheckAccess(userId);

  // Supabase Auth doesn't provide a way to list user sessions
  // Sessions are managed internally and accessed via auth tokens
  // Return empty array for now - this feature is not available with Supabase Auth
  return [];
}

/**
 * Get the user ID and check access
 * if the requested user id is not provided, we use the current user id
 * if the requested user id is provided, we check if the current user has access to the requested user
 * if the current user has access to the requested user, we return the requested user id
 * if the current user does not have access to the requested user, we throw a 404 error
 * if the requested user id is not found, we throw a 404 error
 */
export async function getUserIdAndCheckAccess(
  requestedUserId?: string,
): Promise<string> {
  const user = await getSupabaseUser();
  if (!user) {
    notFound();
  }
  const currentUserId = user.id;
  const userId = requestedUserId ? requestedUserId : currentUserId;
  if (!userId) {
    notFound();
  }
  return userId;
}

/**
 * Get the user stats
 * We can only get stats for the current user as a non-admin user
 * We can get stats for any user as an admin user
 */
export async function getUserStats(userId?: string): Promise<{
  threadCount: number;
  messageCount: number;
  modelStats: Array<{
    model: string;
    messageCount: number;
    totalTokens: number;
    provider: string;
  }>;
  totalTokens: number;
  period: string;
}> {
  await getUserIdAndCheckAccess(userId);
  // User stats functionality removed for now - return empty stats
  const stats = {
    threadCount: 0,
    messageCount: 0,
    modelStats: [],
    totalTokens: 0,
    period: "30d",
  };

  // Add provider information to each model stat
  return {
    ...stats,
    modelStats: stats.modelStats.map((stat: any) => ({
      ...stat,
      provider: getModelProvider(stat.model),
    })) as Array<{
      model: string;
      messageCount: number;
      totalTokens: number;
      provider: string;
    }>,
  };
}

/**
 * Get the user preferences
 * We can only get preferences for the current user as a non-admin user
 * We can get preferences for any user as an admin user
 */
export async function getUserPreferences(
  _userId?: string,
): Promise<UserPreferences | null> {
  // User preferences functionality removed for now - return null
  return null;
}

export async function updateUserDetails(
  _userId: string,
  _name?: string,
  _email?: string,
  _image?: string,
) {
  // User details update functionality removed for now
  console.warn(
    "User details update functionality not supported in current schema",
  );
  return null;
}
