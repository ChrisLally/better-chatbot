"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { UserZodSchema } from "app-types/user";

const SignUpSchema = z.object({
  email: UserZodSchema.shape.email,
  name: UserZodSchema.shape.name,
  password: UserZodSchema.shape.password,
});

export async function existsByEmailAction(email: string): Promise<boolean> {
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
    console.error("Error in existsByEmailAction:", error);
    return false;
  }
}

export async function signUpAction(
  input: z.infer<typeof SignUpSchema>,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Validate input
    const validation = SignUpSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { email, name, password } = validation.data;

    // Check if user already exists
    const exists = await existsByEmailAction(email);
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
    console.error("Error in signUpAction:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}
