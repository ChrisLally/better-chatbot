import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { chatExportRepository } from "lib/db/repository";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getSupabaseUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exports = await chatExportRepository.selectSummaryByExporterId(
      user.id,
    );
    return NextResponse.json(exports);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get exports" },
      { status: 500 },
    );
  }
}
