import { NextRequest, NextResponse } from "next/server";
import { getAgentAction } from "@/app/actions/agent-actions";
import { customModelProvider } from "@/lib/ai/models";
import { buildUserSystemPrompt } from "@/lib/ai/prompts";
import { streamText } from "ai";

export async function POST(request: NextRequest) {
  try {
    const { agent_id, message, api_key } = await request.json();

    // Basic validation
    if (!agent_id || !message) {
      return NextResponse.json(
        { error: "agent_id and message are required" },
        { status: 400 }
      );
    }

    // API key authentication - hardcoded for now
    if (api_key !== "temp_api_key") {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Get the agent
    const agent = await getAgentAction(agent_id);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Build system prompt with agent instructions
    const systemPrompt = buildUserSystemPrompt(
      null, // No user context for API calls
      null, // No user preferences
      agent
    );

    // Get model
    const model = customModelProvider.getModel({
      provider: "openai",
      model: "gpt-4",
    });

    // Stream the response
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Agent chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}