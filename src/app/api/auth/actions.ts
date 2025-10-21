"use server";

import { z } from "zod";
import { UserZodSchema } from "app-types/user";
import { checkEmailExists, signUpUser } from "@/services/supabase/auth-service";

const SignUpSchema = z.object({
  email: UserZodSchema.shape.email,
  name: UserZodSchema.shape.name,
  password: UserZodSchema.shape.password,
});

/**
 * Server action to check if email exists
 * Wrapper around auth-service
 */
export async function existsByEmailAction(email: string): Promise<boolean> {
  return checkEmailExists(email);
}

/**
 * Server action to sign up a new user
 * Wrapper around auth-service with validation
 */
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

    // Call service
    return signUpUser({ email, name, password });
  } catch (error) {
    console.error("Error in signUpAction:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}
