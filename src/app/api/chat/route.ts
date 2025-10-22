import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  Tool,
  UIMessage,
} from "ai";
import { after } from "next/server";
import {
  observe,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";
import { langfuseSpanProcessor } from "@/instrumentation";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

import {
  getThread,
  createThread,
  createMessage,
} from "@/services/supabase/chat-service";
import { updateAgent } from "@/services/supabase/users-service";
import globalLogger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildUserSystemPrompt,
  buildToolCallUnsupportedModelSystemPrompt,
} from "lib/ai/prompts";
import {
  chatApiSchemaRequestBodySchema,
  ChatMention,
  ChatMetadata,
} from "app-types/chat";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  extractInProgressToolPart,
  filterMcpServerCustomizations,
  loadMcpTools,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "./actions";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { getUserPreferences } from "@/lib/user/server";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { nanoBananaTool, openaiImageTool } from "lib/ai/tools/image";
import { ImageToolName } from "lib/ai/tools";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

const handler = async (request: Request) => {
  try {
    const json = await request.json();

    const user = await getSupabaseUser();

    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const {
      id,
      message,
      chatModel,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      imageTool,
      mentions = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    // Set session id and user id on active trace
    const inputText = message.parts.find((part) => part.type === "text")?.text;

    updateActiveObservation({
      input: inputText,
    });

    updateActiveTrace({
      name: "my-ai-sdk-trace",
      sessionId: id, // Using chat ID as session ID
      userId: user.id,
      input: inputText,
    });

    const model = customModelProvider.getModel(chatModel);

    let threadData = await getThread(id);

    if (!threadData) {
      logger.info(`create chat thread: ${id}`);
      threadData = await createThread(user.id, {
        id,
        title: "",
        userId: user.id,
      });
    }

    // TODO: Temporarily disabled thread ownership check to allow anyone to send messages
    // if (threadData.userId !== user.id) {
    //   return new Response("Forbidden", { status: 403 });
    // }

    // Get messages for the thread
    const { getMessages } = await import("@/services/supabase/chat-service");
    const threadMessages = await getMessages(user.id, id);

    const messages: UIMessage[] = threadMessages.map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }
    messages.push(message);

    const supportToolCall = !isToolCallUnsupportedModel(model);

    const agentId = (
      mentions.find((m) => m.type === "agent") as Extract<
        ChatMention,
        { type: "agent" }
      >
    )?.agentId;

    const agent = await rememberAgentAction(agentId, user.id);

    if (agent?.instructions?.mentions) {
      mentions.push(...agent.instructions.mentions);
    }

    const useImageTool = Boolean(imageTool?.model);

    const isToolCallAllowed =
      supportToolCall &&
      (toolChoice != "none" || mentions.length > 0) &&
      !useImageTool;

    const metadata: ChatMetadata = {
      agentId: agent?.id,
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
    };

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const mcpClients = await mcpClientsManager.getClients();
        const mcpTools = await mcpClientsManager.tools();
        logger.info(
          `mcp-server count: ${mcpClients.length}, mcp-tools count :${Object.keys(mcpTools).length}`,
        );
        const MCP_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadMcpTools({
              mentions,
              allowedMcpServers,
            }),
          )
          .orElse({});

        const WORKFLOW_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadWorkFlowTools({
              mentions,
              dataStream,
            }),
          )
          .orElse({});

        const APP_DEFAULT_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
            }),
          )
          .orElse({});
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                { ...MCP_TOOLS, ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS },
                request.signal,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
            }),
          );
        }

        const userPreferences =
          (await getUserPreferences(user.id)) || undefined;

        const mcpServerCustomizations = await safe()
          .map(() => {
            if (Object.keys(MCP_TOOLS ?? {}).length === 0)
              throw new Error("No tools found");
            return rememberMcpServerCustomizationsAction(user.id);
          })
          .map((v) => filterMcpServerCustomizations(MCP_TOOLS!, v))
          .orElse({});

        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(user, userPreferences, agent),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
          !supportToolCall && buildToolCallUnsupportedModelSystemPrompt,
        );

        const IMAGE_TOOL: Record<string, Tool> = useImageTool
          ? {
              [ImageToolName]:
                imageTool?.model === "google"
                  ? nanoBananaTool
                  : openaiImageTool,
            }
          : {};
        const vercelAITooles = safe({
          ...MCP_TOOLS,
          ...WORKFLOW_TOOLS,
        })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
              ...IMAGE_TOOL,
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        const allowedMcpTools = Object.values(allowedMcpServers ?? {})
          .map((t) => t.tools)
          .flat();

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${mentions.length}`,
        );

        logger.info(
          `allowedMcpTools: ${allowedMcpTools.length ?? 0}, allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        if (useImageTool) {
          logger.info(`binding tool count Image: ${imageTool?.model}`);
        } else {
          logger.info(
            `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, MCP: ${Object.keys(MCP_TOOLS ?? {}).length}, Workflow: ${Object.keys(WORKFLOW_TOOLS ?? {}).length}`,
          );
        }
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        const result = streamText({
          model,
          system: systemPrompt,
          messages: convertToModelMessages(messages),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 2,
          tools: vercelAITooles,
          stopWhen: stepCountIs(10),
          toolChoice: "auto",
          abortSignal: request.signal,
          experimental_telemetry: {
            isEnabled: true,
          },
          onFinish: async (result) => {
            updateActiveObservation({
              output: result.content,
            });
            updateActiveTrace({
              output: result.content,
            });
            trace.getActiveSpan()?.end();
          },
          onError: async (error) => {
            updateActiveObservation({
              output: error,
              level: "ERROR",
            });
            updateActiveTrace({
              output: error,
            });
            trace.getActiveSpan()?.end();
          },
        });
        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type == "finish") {
                metadata.usage = part.totalUsage;
                return metadata;
              }
            },
          }),
        );
        // Important in serverless environments: schedule flush after request is finished
        after(async () => await langfuseSpanProcessor.forceFlush());
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        if (responseMessage.id == message.id) {
          await createMessage(user.id, {
            id: responseMessage.id,
            threadId: threadData!.id,
            role: responseMessage.role,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        } else {
          await createMessage(user.id, {
            id: message.id,
            threadId: threadData!.id,
            role: message.role,
            parts: message.parts.map(convertToSavePart),
          });
          await createMessage(user.id, {
            id: responseMessage.id,
            threadId: threadData!.id,
            role: responseMessage.role,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        }

        if (agent) {
          updateAgent(agent.id, {});
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error: any) {
    logger.error(error);
    return Response.json({ message: error.message }, { status: 500 });
  }
};

export const POST = observe(handler, {
  name: "handle-chat-message",
  endOnExit: false, // end observation _after_ stream has finished
});
