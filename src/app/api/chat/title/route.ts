import { smoothStream, streamText } from "ai";

import { customModelProvider } from "lib/ai/models";
import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";
import globalLogger from "logger";
import { ChatModel } from "app-types/chat";
import { chatRepository } from "lib/db/repository";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { colorize } from "consola/utils";
import { handleError } from "../shared.chat";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Title API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const {
      chatModel,
      message = "hello",
      threadId,
    } = json as {
      chatModel?: ChatModel;
      message: string;
      threadId: string;
    };

    const user = await getSupabaseUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info(
      `chatModel: ${chatModel?.provider}/${chatModel?.model}, threadId: ${threadId}`,
    );

    const result = streamText({
      model: customModelProvider.getModel(chatModel),
      system: CREATE_THREAD_TITLE_PROMPT,
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: message,
      abortSignal: request.signal,
      onFinish: (ctx) => {
        chatRepository
          .upsertThread({
            id: threadId,
            title: ctx.text,
            userId: user.id,
          })
          .catch((err) => logger.error(err));
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    return new Response(handleError(err), { status: 500 });
  }
}
