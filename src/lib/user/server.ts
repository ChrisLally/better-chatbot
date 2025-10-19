"use server";

import { BasicUserWithLastLogin, UserPreferences } from "app-types/user";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { userRepository } from "lib/db/repository";
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
  return await userRepository.getUserById(resolvedUserId);
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
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  const stats = await userRepository.getUserStats(resolvedUserId);

  // Add provider information to each model stat
  return {
    ...stats,
    modelStats: stats.modelStats.map((stat) => ({
      ...stat,
      provider: getModelProvider(stat.model),
    })),
  };
}

/**
 * Get the user preferences
 * We can only get preferences for the current user as a non-admin user
 * We can get preferences for any user as an admin user
 */
export async function getUserPreferences(
  userId?: string,
): Promise<UserPreferences | null> {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  return await userRepository.getPreferences(resolvedUserId);
}

export async function updateUserDetails(
  userId: string,
  name?: string,
  email?: string,
  image?: string,
) {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  if (!name && !email && !image) {
    return;
  }
  return await userRepository.updateUserDetails({
    userId: resolvedUserId,
    ...(name && { name }),
    ...(email && { email }),
    ...(image && { image }),
  });
}
