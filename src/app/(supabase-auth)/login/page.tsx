import SignIn from "@/components/auth/sign-in";
import { getAuthConfig } from "@/lib/supabase/auth-helpers";

export default async function LoginPage() {
  const {
    emailAndPasswordEnabled,
    signUpEnabled,
    socialAuthenticationProviders,
  } = getAuthConfig();

  return (
    <SignIn
      emailAndPasswordEnabled={emailAndPasswordEnabled}
      signUpEnabled={signUpEnabled}
      socialAuthenticationProviders={socialAuthenticationProviders}
      isFirstUser={false}
    />
  );
}
