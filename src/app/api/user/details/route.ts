import { getUser } from "@/services/supabase/users-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get current user ID from auth
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userDetails = await getUser(user.id);
    return NextResponse.json(userDetails ?? {});
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get user details" },
      { status: 500 },
    );
  }
}
