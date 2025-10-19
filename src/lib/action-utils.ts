import "server-only";
import { z } from "zod";
import { UserSession, UserSessionUser } from "app-types/user";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  requireAdminPermission,
  requireUserManagePermissionFor,
} from "./auth/permissions";

// Type constraint for schemas that can have optional userId
type SchemaWithOptionalUserId = z.ZodType<{ userId?: string }, any>;

export type ActionState =
  | {
      success?: boolean;
      message?: string;
      [key: string]: any;
    }
  | null
  | undefined;

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>,
) {
  return async (_prevState: ActionState, formData: FormData) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: UserSessionUser,
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
) {
  return async (_prevState: ActionState, formData: FormData) => {
    const user = await getSupabaseUser();
    if (!user) {
      return {
        success: false,
        message: "User is not authenticated",
      } as T;
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        success: false,
        message: result.error.issues[0].message,
      } as T;
    }

    // Construct a UserSessionUser object that matches the old structure
    const sessionUser: UserSessionUser = {
      ...user,
      id: user.id,
      name: user.user_metadata?.name || user.email || "",
      image: user.user_metadata?.avatar_url || null,
      role: user.role || "user", // default to user role
    };

    return action(result.data, formData, sessionUser);
  };
}

// ========== PERMISSION-BASED VALIDATORS ==========

type ValidatedActionWithSimpleAdminAccess<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  userSession: UserSession,
) => Promise<T>;

/**
 * Validates action and requires admin permissions
 */
export function validatedActionWithAdminPermission<
  S extends z.ZodType<any, any>,
  T,
>(schema: S, action: ValidatedActionWithSimpleAdminAccess<S, T>) {
  return async (_prevState: ActionState, formData: FormData) => {
    const user = await getSupabaseUser();
    if (!user) {
      return {
        success: false,
        message: "User is not authenticated",
      } as T;
    }

    // Construct a UserSession object that matches the old structure
    const userSession: UserSession = {
      user: {
        ...user,
        id: user.id,
        name: user.user_metadata?.name || user.email || "",
        image: user.user_metadata?.avatar_url || null,
        role: user.role || "user",
      },
    };

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        success: false,
        message: result.error.issues[0].message,
      } as T;
    }

    // Check admin permissions
    try {
      await requireAdminPermission();
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "You are not authorized to perform this action",
      } as T;
    }

    return action(result.data, formData, userSession);
  };
}

type ValidatedActionWithUserManageAccess<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  userId: string,
  userSession: UserSession,
  isOwnResource: boolean,
  formData: FormData,
) => Promise<T>;

/**
 * Validates action and allows if user manages themselves OR has user management permissions
 */
export function validatedActionWithUserManagePermission<
  S extends SchemaWithOptionalUserId,
  T,
>(schema: S, action: ValidatedActionWithUserManageAccess<S, T>) {
  return async (_prevState: ActionState, formData: FormData) => {
    const user = await getSupabaseUser();
    if (!user) {
      return {
        success: false,
        message: "User is not authenticated",
      } as T;
    }

    // Construct a UserSession object that matches the old structure
    const userSession: UserSession = {
      user: {
        ...user,
        id: user.id,
        name: user.user_metadata?.name || user.email || "",
        image: user.user_metadata?.avatar_url || null,
        role: user.role || "user",
      },
    };

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        success: false,
        message: result.error.issues[0].message,
      } as T;
    }

    const userId = result.data.userId || userSession.user.id;

    // Check permissions using our simplified permission system
    try {
      await requireUserManagePermissionFor(userId);
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "You are not authorized to perform this action",
      } as T;
    }

    const isOwnResource = userId === userSession.user.id;
    return action(result.data, userId, userSession, isOwnResource, formData);
  };
}
