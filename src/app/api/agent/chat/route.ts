import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { customModelProvider } from "@/lib/ai/models";
import { buildUserSystemPrompt } from "@/lib/ai/prompts";
import { generateText } from "ai";
import {
  createMessage,
  getMessages as getThreadMessages,
} from "@/services/supabase/chat-service";
import { generateUUID } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { agent_id, message, api_key, thread_id } = await request.json();

    // Basic validation
    if (!agent_id || !message) {
      return NextResponse.json(
        { error: "agent_id and message are required" },
        { status: 400 },
      );
    }

    // API key authentication - hardcoded for now
    if (api_key !== "temp_api_key") {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Get the agent using admin client (no user auth required for API access)
    const supabase = await getSupabaseAdmin();

    const { data: agentData, error } = await supabase
      .from("users")
      .select(
        "id, name, description, icon, instructions, visibility, created_at, updated_at",
      )
      .eq("id", agent_id)
      .eq("user_type", "agent")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      console.error("Error fetching agent:", error);
      return NextResponse.json(
        { error: "Failed to fetch agent" },
        { status: 500 },
      );
    }

    // Convert to Agent type
    const agent = {
      id: agentData.id,
      name: agentData.name,
      description: agentData.description ?? undefined,
      icon: agentData.icon as any,
      instructions: agentData.instructions as any,
      userId: agentData.id,
      visibility: (agentData.visibility || "private") as
        | "public"
        | "private"
        | "readonly",
      createdAt: new Date(agentData.created_at),
      updatedAt: new Date(agentData.updated_at),
    };

    // Use existing thread or create a new one
    const conversationId = thread_id || generateUUID();
    let isNewThread = false;

    // Check if thread exists, if not create it
    const { data: existingThread } = await supabase
      .from("chat_thread")
      .select("id, title")
      .eq("id", conversationId)
      .single();

    if (!existingThread) {
      isNewThread = true;
      await supabase.from("chat_thread").insert({
        id: conversationId,
        title: `API Chat with ${agent.name}`,
        user_id: agent.id, // Use agent's user_id for the thread
      });
    }

    // Save the user message
    const userMessageId = generateUUID();
    await supabase.from("chat_message").insert({
      id: userMessageId,
      thread_id: conversationId,
      role: "user",
      parts: [{ type: "text", text: message }],
      metadata: { agentId: agent_id },
    });

    // Trigger agent response generation in the background
    // Don't await - let it run asynchronously
    (async () => {
      try {
        // Build system prompt with agent instructions
        const systemPrompt = buildUserSystemPrompt(
          undefined, // No user context for API calls
          undefined, // No user preferences
          agent,
        );

        // Get model
        const model = customModelProvider.getModel({
          provider: "openai",
          model: "gpt-4",
        });

        // Generate assistant message ID for saving response
        const assistantMessageId = generateUUID();

        // Build conversation messages
        let conversationMessages: Array<{
          role: "user" | "assistant";
          content: string;
        }> = [];

        // If this is a follow-up to an existing thread, fetch conversation history
        if (!isNewThread) {
          const previousMessages = await getThreadMessages(
            agent.id,
            conversationId,
          );
          conversationMessages = previousMessages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.parts
              .filter((part) => part.type === "text")
              .map((part) => (part as any).text)
              .join(""),
          }));
        }

        // Add the current user message (which was already saved)
        conversationMessages.push({
          role: "user",
          content: message,
        });

        // Generate the response and save it
        const { text } = await generateText({
          model,
          system: systemPrompt,
          messages: conversationMessages,
        });

        // Save the assistant response
        await createMessage(agent.id, {
          id: assistantMessageId,
          threadId: conversationId,
          role: "assistant",
          parts: [{ type: "text", text }],
          metadata: { agentId: agent_id },
        });
      } catch (error) {
        console.error("Error generating agent response:", error);
      }
    })();

    // Return immediately with agent and thread details
    return NextResponse.json({
      success: true,
      isNewThread,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
      },
      thread: {
        id: conversationId,
        title: existingThread?.title || `API Chat with ${agent.name}`,
      },
      message: {
        id: userMessageId,
        role: "user",
        text: message,
      },
    });
  } catch (error) {
    console.error("Agent chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
