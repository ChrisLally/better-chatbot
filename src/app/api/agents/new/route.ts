import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/services/supabase/users-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    const result = await createAgent({
      name,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      agentId: result.agentId,
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}
