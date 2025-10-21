import { NextRequest, NextResponse } from "next/server";
import { getAgentsAction } from "@/app/actions/agent-actions";

export async function POST(request: NextRequest) {
  try {
    const { api_key } = await request.json();

    // API key authentication - hardcoded for now
    if (api_key !== "temp_api_key") {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Get all agents
    const agents = await getAgentsAction(["all"], 100);

    // Return simplified agent list with just the info needed for API calls
    const agentList = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      visibility: agent.visibility
    }));

    return NextResponse.json({
      success: true,
      agents: agentList,
      count: agentList.length
    });

  } catch (error) {
    console.error("Agent list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for convenience
export async function GET(request: NextRequest) {
  try {
    // For GET requests, check API key in query params or headers
    const apiKey = request.nextUrl.searchParams.get('api_key') || 
                   request.headers.get('x-api-key');

    if (apiKey !== "temp_api_key") {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Get all agents
    const agents = await getAgentsAction(["all"], 100);

    // Return simplified agent list
    const agentList = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      visibility: agent.visibility
    }));

    return NextResponse.json({
      success: true,
      agents: agentList,
      count: agentList.length
    });

  } catch (error) {
    console.error("Agent list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}