"use server";

import {
  generateObject,
  generateText,
  jsonSchema,
  LanguageModel,
  type UIMessage,
} from "ai";

import {
  CREATE_THREAD_TITLE_PROMPT,
  generateExampleToolSchemaPrompt,
} from "lib/ai/prompts";

import type { ChatModel, ChatThread } from "app-types/chat";

import {
  chatExportRepository,
  mcpMcpToolCustomizationRepository,
  mcpServerCustomizationRepository,
} from "lib/db/repository";
import {
  getThread,
  getMessages,
  deleteMessage,
  deleteThread,
  deleteMessagesAfterMessage,
  updateThread,
  deleteAllThreads,
  checkThreadAccess,
} from "@/services/supabase/chat-service";
import { getAgent } from "@/services/supabase/users-service";
import { customModelProvider } from "lib/ai/models";
import { toAny } from "lib/utils";
import { McpServerCustomizationsPrompt, MCPToolInfo } from "app-types/mcp";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import logger from "logger";

import { JSONSchema7 } from "json-schema";
import { ObjectJsonSchema7 } from "app-types/util";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { Agent } from "app-types/agent";

export async function getUserId() {
  const user = await getSupabaseUser();
  const userId = user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function generateTitleFromUserMessageAction({
  message,
  model,
}: { message: UIMessage; model: LanguageModel }) {
  const user = await getSupabaseUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const prompt = toAny(message.parts?.at(-1))?.text || "unknown";

  const { text: title } = await generateText({
    model,
    system: CREATE_THREAD_TITLE_PROMPT,
    prompt,
  });

  return title.trim();
}

export async function selectThreadWithMessagesAction(threadId: string) {
  const user = await getSupabaseUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const thread = await getThread(threadId);

  if (!thread) {
    logger.error("Thread not found", threadId);
    return null;
  }
  if (thread.userId !== user.id) {
    return null;
  }
  const messages = await getMessages(threadId);
  return { ...thread, messages: messages ?? [] };
}

export async function deleteMessageAction(messageId: string) {
  await deleteMessage(messageId);
}

export async function deleteThreadAction(threadId: string) {
  await deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  "use server";
  await deleteMessagesAfterMessage(messageId);
}

export async function updateThreadAction(
  id: string,
  thread: Partial<Omit<ChatThread, "createdAt" | "updatedAt" | "userId">>,
) {
  await updateThread(id, thread);
}

export async function deleteThreadsAction() {
  await deleteAllThreads();
}

export async function deleteUnarchivedThreadsAction() {
  // TODO: Implement deleteUnarchivedThreads in chat-service
  const userId = await getUserId();
  const { archiveRepository } = await import("lib/db/repository");

  // Get all archives for the user
  const archives = await archiveRepository.getArchivesByUserId(userId);

  // Get all archived items from all archives
  const archivedThreadIds: string[] = [];
  for (const archive of archives) {
    const items = await archiveRepository.getArchiveItems(archive.id);
    archivedThreadIds.push(...items.map((item) => item.itemId));
  }

  const { getThreads } = await import("@/services/supabase/chat-service");
  const allThreads = await getThreads();

  for (const thread of allThreads) {
    if (!archivedThreadIds.includes(thread.id)) {
      await deleteThread(thread.id);
    }
  }
}

export async function generateExampleToolSchemaAction(options: {
  model?: ChatModel;
  toolInfo: MCPToolInfo;
  prompt?: string;
}) {
  const model = customModelProvider.getModel(options.model);

  const schema = jsonSchema(
    toAny({
      ...options.toolInfo.inputSchema,
      properties: options.toolInfo.inputSchema?.properties ?? {},
      additionalProperties: false,
    }),
  );
  const { object } = await generateObject({
    model,
    schema,
    prompt: generateExampleToolSchemaPrompt({
      toolInfo: options.toolInfo,
      prompt: options.prompt,
    }),
  });

  return object;
}

export async function rememberMcpServerCustomizationsAction(userId: string) {
  const key = CacheKeys.mcpServerCustomizations(userId);

  const cachedMcpServerCustomizations =
    await serverCache.get<Record<string, McpServerCustomizationsPrompt>>(key);
  if (cachedMcpServerCustomizations) {
    return cachedMcpServerCustomizations;
  }

  const mcpServerCustomizations =
    await mcpServerCustomizationRepository.selectByUserId(userId);
  const mcpToolCustomizations =
    await mcpMcpToolCustomizationRepository.selectByUserId(userId);

  const serverIds: string[] = [
    ...mcpServerCustomizations.map(
      (mcpServerCustomization) => mcpServerCustomization.mcpServerId,
    ),
    ...mcpToolCustomizations.map(
      (mcpToolCustomization) => mcpToolCustomization.mcpServerId,
    ),
  ];

  const prompts = Array.from(new Set(serverIds)).reduce(
    (acc, serverId) => {
      const sc = mcpServerCustomizations.find((v) => v.mcpServerId == serverId);
      const tc = mcpToolCustomizations.filter(
        (mcpToolCustomization) => mcpToolCustomization.mcpServerId === serverId,
      );
      const data: McpServerCustomizationsPrompt = {
        name: sc?.serverName || tc[0]?.serverName || "",
        id: serverId,
        prompt: sc?.prompt || "",
        tools: tc.reduce(
          (acc, v) => {
            acc[v.toolName] = v.prompt || "";
            return acc;
          },
          {} as Record<string, string>,
        ),
      };
      acc[serverId] = data;
      return acc;
    },
    {} as Record<string, McpServerCustomizationsPrompt>,
  );

  serverCache.set(key, prompts, 1000 * 60 * 30); // 30 minutes
  return prompts;
}

export async function generateObjectAction({
  model,
  prompt,
  schema,
}: {
  model?: ChatModel;
  prompt: {
    system?: string;
    user?: string;
  };
  schema: JSONSchema7 | ObjectJsonSchema7;
}) {
  const result = await generateObject({
    model: customModelProvider.getModel(model),
    system: prompt.system,
    prompt: prompt.user || "",
    schema: jsonSchemaToZod(schema),
  });
  return result.object;
}

export async function rememberAgentAction(
  agent: string | undefined,
  _userId: string,
) {
  if (!agent) return undefined;
  const key = CacheKeys.agentInstructions(agent);
  let cachedAgent = await serverCache.get<Agent | null>(key);
  if (!cachedAgent) {
    cachedAgent = await getAgent(agent);
    await serverCache.set(key, cachedAgent);
  }
  return cachedAgent as Agent | undefined;
}

export async function exportChatAction({
  threadId,
  expiresAt,
}: {
  threadId: string;
  expiresAt?: Date;
}) {
  const userId = await getUserId();

  const isAccess = await checkThreadAccess(threadId);
  if (!isAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  return await chatExportRepository.exportChat({
    threadId,
    exporterId: userId,
    expiresAt: expiresAt ?? undefined,
  });
}
