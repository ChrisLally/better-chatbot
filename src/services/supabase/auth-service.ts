import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Auth Service
 * Handles authentication operations with Supabase Auth
 * Pattern 2: Creates client internally, does not accept client as parameter
 */

/**
 * Check if a user exists by email
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Try to get user by email using admin API
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("Error checking email existence:", error);
      return false;
    }

    return data.users.some((user) => user.email === email);
  } catch (error) {
    console.error("Error in checkEmailExists:", error);
    return false;
  }
}

/**
 * Sign up a new user with email and password
 */
export async function signUpUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { email, name, password } = input;

    // Check if user already exists
    const exists = await checkEmailExists(email);
    if (exists) {
      return {
        success: false,
        message: "An account with this email already exists",
      };
    }

    const supabase = await createClient();

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      console.error("Signup error:", error);
      return {
        success: false,
        message: error.message || "Failed to create account",
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: "Failed to create account",
      };
    }

    return {
      success: true,
      message: "Account created successfully! You can now sign in.",
    };
  } catch (error) {
    console.error("Error in signUpUser:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}
