import "server-only";

import { createClient } from "./server";
import { parseEnvBoolean } from "../utils";
import logger from "logger";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Auth Configuration
 * Parses environment variables for authentication settings
 */
export interface AuthConfig {
  emailAndPasswordEnabled: boolean;
  signUpEnabled: boolean;
  socialAuthenticationProviders: ("google" | "github" | "microsoft")[];
}

export function getAuthConfig(): AuthConfig {
  const emailAndPasswordEnabled = process.env.DISABLE_EMAIL_SIGN_IN
    ? !parseEnvBoolean(process.env.DISABLE_EMAIL_SIGN_IN)
    : true;

  const signUpEnabled = process.env.DISABLE_SIGN_UP
    ? !parseEnvBoolean(process.env.DISABLE_SIGN_UP)
    : true;

  const socialAuthenticationProviders: ("google" | "github" | "microsoft")[] =
    [];

  // Check which social providers are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialAuthenticationProviders.push("google");
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    socialAuthenticationProviders.push("github");
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    socialAuthenticationProviders.push("microsoft");
  }

  return {
    emailAndPasswordEnabled,
    signUpEnabled,
    socialAuthenticationProviders,
  };
}

/**
 * Get current authenticated user from Supabase
 * Returns null if not authenticated or on error
 */
export async function getSupabaseUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.error("Error getting Supabase user:", error);
      return null;
    }

    return user;
  } catch (error) {
    logger.error("Error getting Supabase user:", error);
    return null;
  }
}

/**
 * Get current session from Supabase
 * Returns null if no session or on error
 */
export async function getSupabaseSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logger.error("Error getting Supabase session:", error);
      return null;
    }

    return session;
  } catch (error) {
    logger.error("Error getting Supabase session:", error);
    return null;
  }
}

/**
 * Get current authenticated user as BasicUser (from app database)
 * Returns null if not authenticated or user not found in database
 */
export async function getBasicUser(): Promise<
  import("app-types/user").BasicUser | null
> {
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return null;
    }

    // Import the getUser function to fetch from database
    const { getUser } = await import("lib/user/server");
    const user = await getUser(supabaseUser.id);

    if (!user) {
      return null;
    }

    // Convert BasicUserWithLastLogin to BasicUser by removing lastLogin
    const { lastLogin, ...basicUser } = user;
    return basicUser;
  } catch (error) {
    logger.error("Error getting basic user:", error);
    return null;
  }
}
