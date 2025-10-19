import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { getUser } from "lib/user/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getSupabaseUser();

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
