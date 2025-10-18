import SignIn from "@/components/auth/sign-in";
import { createClient } from "@/lib/supabase/server";

// For now, we'll use a simple configuration
// In a full migration, this would come from a proper auth config system
const authConfig = {
  emailAndPasswordEnabled: true,
  signUpEnabled: true,
  socialAuthenticationProviders: ["google", "github", "microsoft"] as (
    | "google"
    | "github"
    | "microsoft"
  )[],
};

export default async function LoginPage() {
  // Check if this is the first user (for demo purposes)
  // In a full migration, this would use proper user counting logic
  const _supabase = await createClient();

  // For now, always show the login form since we want users to be able to log in
  // In a proper implementation, this would check if any users exist in the database
  const isFirstUser = false; // Simplified logic - always show login form

  return (
    <SignIn
      emailAndPasswordEnabled={authConfig.emailAndPasswordEnabled}
      signUpEnabled={authConfig.signUpEnabled}
      socialAuthenticationProviders={authConfig.socialAuthenticationProviders}
      isFirstUser={isFirstUser}
    />
  );
}
