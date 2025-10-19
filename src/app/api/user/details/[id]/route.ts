import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { getUser } from "lib/user/server";
import { canManageUser } from "lib/auth/permissions";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    // Use our new permission system: user can get own details OR admin can get any user's details
    if (!(await canManageUser(id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userDetails = await getUser(id);
    return NextResponse.json(userDetails ?? {});
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get user details" },
      { status: 500 },
    );
  }
}
