import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { chatExportRepository } from "lib/db/repository";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSupabaseUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has permission to delete this export
    const hasAccess = await chatExportRepository.checkAccess(id, user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await chatExportRepository.deleteById(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete export" },
      { status: 500 },
    );
  }
}
