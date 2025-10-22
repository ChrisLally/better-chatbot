import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { customModelProvider } from "@/lib/ai/models";
import { buildUserSystemPrompt } from "@/lib/ai/prompts";
import { streamText, stepCountIs, Tool } from "ai";
import {
  createMessage,
  getMessages as getThreadMessages,
} from "@/services/supabase/chat-service";
import { generateUUID } from "@/lib/utils";
import {
  loadMcpTools,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "@/app/api/chat/shared.chat";
import { safe } from "ts-safe";
import type { ChatMetadata } from "app-types/chat";

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

        // Load tools based on agent mentions
        const mentions = agent.instructions?.mentions || [];

        console.log(
          `[Agent ${agent.id}] Starting tool loading. Mentions: ${JSON.stringify(mentions)}`,
        );

        // Load MCP tools
        const MCP_TOOLS = await safe()
          .map(() =>
            loadMcpTools({
              mentions,
              allowedMcpServers: {},
            }),
          )
          .orElse({});

        console.log(
          `[Agent ${agent.id}] Loaded MCP tools: ${Object.keys(MCP_TOOLS).length}. Tool names: ${Object.keys(MCP_TOOLS).join(", ")}`,
        );

        // Load workflow tools (skip dataStream since not available in this context)
        const WORKFLOW_TOOLS = await safe()
          .map(() =>
            loadWorkFlowTools({
              mentions,
              dataStream: undefined as any,
            }),
          )
          .orElse({});

        console.log(
          `[Agent ${agent.id}] Loaded Workflow tools: ${Object.keys(WORKFLOW_TOOLS).length}`,
        );

        // Load app default tools
        const APP_DEFAULT_TOOLS = await safe()
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit: [], // No default toolkit for API calls
            }),
          )
          .orElse({});

        console.log(
          `[Agent ${agent.id}] Loaded App Default tools: ${Object.keys(APP_DEFAULT_TOOLS).length}`,
        );

        // Merge all tools
        const tools: Record<string, Tool> = {
          ...MCP_TOOLS,
          ...WORKFLOW_TOOLS,
          ...APP_DEFAULT_TOOLS,
        };

        console.log(
          `[Agent ${agent.id}] Total tools available: ${Object.keys(tools).length}. All tools: ${Object.keys(tools).join(", ")}`,
        );

        // Generate the response with tool support
        // Key: We must use toUIMessageStream and iterate through it to get tool execution
        const result = streamText({
          model,
          system: systemPrompt,
          messages: conversationMessages,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          toolChoice: Object.keys(tools).length > 0 ? "auto" : undefined,
          stopWhen: stepCountIs(10),
          maxRetries: 2,
        });

        console.log(
          `[Agent ${agent.id}] Starting to consume stream with ${Object.keys(tools).length} tools available`,
        );

        // Convert to UI message stream - this is what triggers tool execution
        const uiStream = result.toUIMessageStream();

        // Iterate through the stream to ensure full processing and tool execution
        let eventCount = 0;
        try {
          for await (const _event of uiStream) {
            eventCount++;
            // Just consume the stream - the iteration itself triggers tool execution
          }
        } catch (streamError) {
          console.error(
            `[Agent ${agent.id}] Error during stream iteration:`,
            streamError,
          );
        }

        console.log(
          `[Agent ${agent.id}] Stream iteration complete. Processed ${eventCount} events`,
        );

        // Now get the full response after stream is done
        const response = await result.response;

        console.log(
          `[Agent ${agent.id}] Response available with ${response.messages?.length || 0} messages`,
        );

        // Extract the assistant message
        const responseMessage = response.messages?.find(
          (m) => m.role === "assistant",
        );

        if (!responseMessage) {
          console.error(`[Agent ${agent.id}] No assistant message in response`);
        } else {
          console.log(
            `[Agent ${agent.id}] Got assistant message, content is ${typeof responseMessage.content}`,
          );

          // Get the parts
          const finalParts = Array.isArray(responseMessage.content)
            ? (responseMessage.content as any[]).map(convertToSavePart)
            : [{ type: "text" as const, text: responseMessage.content }];

          console.log(
            `[Agent ${agent.id}] Final parts (${finalParts.length}): ${finalParts.map((p: any) => p.type).join(", ")}`,
          );

          // Save the message
          const toolChoice: "auto" | "none" | "manual" | undefined =
            Object.keys(tools).length > 0 ? "auto" : "none";

          const usage = await result.usage;
          const metadata: ChatMetadata = {
            agentId: agent_id,
            toolChoice,
            toolCount: Object.keys(tools).length,
            usage: usage
              ? {
                  inputTokens: usage.inputTokens || 0,
                  outputTokens: usage.outputTokens || 0,
                  totalTokens: ((usage.inputTokens || 0) +
                    (usage.outputTokens || 0)) as never,
                }
              : undefined,
          };

          await createMessage(agent.id, {
            id: assistantMessageId,
            threadId: conversationId,
            role: "assistant",
            parts: finalParts,
            metadata,
          });

          console.log(
            `[Agent ${agent.id}] Saved message with ${finalParts.length} parts`,
          );
        }
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
