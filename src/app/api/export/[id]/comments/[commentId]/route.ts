import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { chatExportRepository } from "lib/db/repository";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const user = await getSupabaseUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    // Check if user has permission to delete this comment
    const hasAccess = await chatExportRepository.checkCommentAccess(
      commentId,
      user.id,
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await chatExportRepository.deleteComment(commentId, user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 500 },
    );
  }
}
