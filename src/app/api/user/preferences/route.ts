import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getSupabaseUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // User preferences functionality removed for now
    return NextResponse.json({});
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get preferences" },
      { status: 500 },
    );
  }
}

export async function PUT(_request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // User preferences functionality removed for now
    return NextResponse.json({
      success: true,
      preferences: {},
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update preferences" },
      { status: 500 },
    );
  }
}
