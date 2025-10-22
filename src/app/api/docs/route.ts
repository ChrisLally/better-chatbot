import { getAllDocs } from "@/lib/docs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const index = getAllDocs();
    return NextResponse.json(index);
  } catch (error) {
    console.error("Error fetching docs index:", error);
    return NextResponse.json(
      { error: "Failed to fetch docs" },
      { status: 500 },
    );
  }
}
