"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          router.push("/auth/error?error=" + encodeURIComponent(error.message));
          return;
        }

        if (data.session) {
          console.log("Successfully authenticated:", data.session.user);
          router.push("/workspace");
        } else {
          // Try to get session from URL hash
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1),
          );
          const accessToken = hashParams.get("access_token");

          if (accessToken) {
            // Session should be automatically set by Supabase
            router.push("/workspace");
          } else {
            router.push("/auth/error?error=no_session");
          }
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        router.push("/auth/error?error=unexpected_error");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p>Completing sign in...</p>
      </div>
    </div>
  );
}
