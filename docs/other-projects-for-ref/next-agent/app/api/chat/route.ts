import { weatherAgent } from "@/agent/weather-agent";
import { createAgentUIStreamResponse } from "ai";
import { after } from "next/server";
import {
  observe,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";
import { langfuseSpanProcessor } from "@/instrumentation";
import { loadMCPTools } from "@/lib/mcp/load-mcp-tools";

// Simple in-memory storage for demonstration
// In production, this should be persisted to a database
interface SavedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: any[];
  metadata?: any;
  createdAt: Date;
}

const conversationHistory: Record<
  string,
  {
    messages: SavedMessage[];
    createdAt: Date;
  }
> = {};

const handler = async (request: Request) => {
  try {
    const {
      messages,
      sessionId = "default-session",
      includeMCPTools = true,
    } = await request.json();

    // Set session id and user id on active trace
    const inputText = messages[messages.length - 1]?.parts?.find(
      (part: any) => part.type === "text",
    )?.text;

    updateActiveObservation({
      input: inputText,
    });

    updateActiveTrace({
      name: "weather-agent-chat",
      sessionId,
      input: inputText,
    });

    // Load MCP tools
    const mcpTools = includeMCPTools ? await loadMCPTools() : {};
    const totalToolCount = Object.keys(mcpTools).length;

    if (totalToolCount > 0) {
      console.log(
        `[${sessionId}] Loaded ${totalToolCount} MCP tools from weather server`,
      );
    }

    const stream = createAgentUIStreamResponse({
      agent: weatherAgent,
      messages,
      onFinish: async ({ responseMessage }) => {
        try {
          // Store the conversation in memory
          if (!conversationHistory[sessionId]) {
            conversationHistory[sessionId] = {
              messages: [],
              createdAt: new Date(),
            };
          }

          // Get the user message (last message in input)
          const userMessage = messages[messages.length - 1];

          // Save user message with all its parts (including tool calls, etc)
          conversationHistory[sessionId].messages.push({
            id: userMessage.id || `user-${Date.now()}`,
            role: userMessage.role,
            parts: userMessage.parts || [],
            metadata: userMessage.metadata,
            createdAt: new Date(),
          });

          // Save assistant response message with all its parts (text, tool-use, tool-result, etc)
          conversationHistory[sessionId].messages.push({
            id: responseMessage.id,
            role: responseMessage.role,
            parts: responseMessage.parts || [],
            metadata: responseMessage.metadata,
            createdAt: new Date(),
          });

          // Extract text content for logging and Langfuse
          const responseContent = responseMessage.parts
            ?.map((part: any) => {
              if (part.type === "text") {
                return part.text;
              }
              if (part.type === "tool-use") {
                return `[Tool Call: ${part.toolName}]`;
              }
              if (part.type === "tool-result") {
                return `[Tool Result: ${part.toolName}]`;
              }
              return "";
            })
            .filter(Boolean)
            .join("\n");

          // Add tool metadata to trace
          const toolCalls =
            responseMessage.parts?.filter((p: any) => p.type === "tool-use") ||
            [];
          const toolResults =
            responseMessage.parts?.filter(
              (p: any) => p.type === "tool-result",
            ) || [];

          updateActiveObservation({
            output: responseContent || "Agent completed",
            metadata: {
              toolCount: toolCalls.length,
              mcpToolsLoaded: totalToolCount,
              toolsUsed: toolCalls.map((t: any) => t.toolName),
            },
          });

          updateActiveTrace({
            output: responseContent || "Agent completed",
            metadata: {
              toolCount: toolCalls.length,
              mcpToolsLoaded: totalToolCount,
              mcpToolsUsed: toolCalls
                .filter((t: any) => t.toolName.includes(":"))
                .map((t: any) => t.toolName),
            },
          });

          console.log(
            `[${sessionId}] Conversation saved. Total messages: ${conversationHistory[sessionId].messages.length}, Tool calls: ${toolCalls.length}, Tool results: ${toolResults.length}`,
          );
        } catch (error) {
          console.error("Error in onFinish callback:", error);
        }
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        updateActiveObservation({
          output: errorMessage,
          level: "ERROR",
        });
        updateActiveTrace({
          output: errorMessage,
        });
        return errorMessage;
      },
    });

    // Important in serverless environments: schedule flush after request is finished
    after(async () => {
      try {
        trace.getActiveSpan()?.end();
        await langfuseSpanProcessor.forceFlush();
      } catch (flushError) {
        console.error("Error during flush:", flushError);
      }
    });

    return stream;
  } catch (error: any) {
    console.error(error);
    updateActiveObservation({
      output: error.message,
      level: "ERROR",
    });
    updateActiveTrace({
      output: error.message,
    });
    return Response.json({ message: error.message }, { status: 500 });
  }
};

export const POST = observe(handler, {
  name: "handle-chat-message",
  endOnExit: false, // end observation _after_ stream has finished
});
