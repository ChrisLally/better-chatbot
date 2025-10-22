import { getDocBySlug } from "@/lib/docs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  try {
    const { slug } = await params;

    if (!slug || slug.length === 0) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const doc = getDocBySlug(slug);

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
}
