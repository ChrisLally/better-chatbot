import {
  FilePart,
  ImagePart,
  ModelMessage,
  ToolResultPart,
  tool as createTool,
  generateText,
} from "ai";
import { generateImageWithNanoBanana } from "lib/ai/image/generate-image";
import z from "zod";
import { ImageToolName } from "..";
import logger from "logger";
import { openai } from "@ai-sdk/openai";
import { toAny } from "lib/utils";

export type ImageToolResult = {
  images: {
    url: string;
    mimeType?: string;
  }[];
  mode?: "create" | "edit" | "composite";
  guide?: string;
  model: string;
};

export const nanoBananaTool = createTool({
  name: ImageToolName,
  description: `Generate, edit, or composite images based on the conversation context. This tool automatically analyzes recent messages to create images without requiring explicit input parameters. It includes all user-uploaded images from the recent conversation and only the most recent AI-generated image to avoid confusion. Use the 'mode' parameter to specify the operation type: 'create' for new images, 'edit' for modifying existing images, or 'composite' for combining multiple images. Use this when the user requests image creation, modification, or visual content generation.`,
  inputSchema: z.object({
    mode: z
      .enum(["create", "edit", "composite"])
      .optional()
      .default("create")
      .describe(
        "Image generation mode: 'create' for new images, 'edit' for modifying existing images, 'composite' for combining multiple images",
      ),
  }),
  execute: async ({ mode }, { messages, abortSignal }) => {
    try {
      let hasFoundImage = false;

      // Get latest 6 messages and extract only the most recent image for editing context
      // This prevents multiple image references that could confuse the image generation model
      const latestMessages = messages
        .slice(-6)
        .reverse()
        .map((m) => {
          if (m.role != "tool") return m;
          if (hasFoundImage) return m; // Skip if we already found an image
          const fileParts = m.content.flatMap(convertToImageToolPartToFilePart);
          if (fileParts.length === 0) return m;
          hasFoundImage = true; // Mark that we found the most recent image
          return {
            ...m,
            role: "assistant",
            content: fileParts,
          };
        })
        .filter((v) => Boolean(v?.content?.length))
        .reverse() as ModelMessage[];

      const images = await generateImageWithNanoBanana({
        prompt: "",
        abortSignal,
        messages: latestMessages,
      });

      const resultImages = images.images.map((image) => ({
        url: `data:${image.mimeType || "image/png"};base64,${image.base64}`,
        mimeType: image.mimeType || "image/png",
      }));

      return {
        images: resultImages,
        mode,
        model: "gemini-2.5-flash-image",
        guide:
          resultImages.length > 0
            ? "The image has been successfully generated and is now displayed above. If you need any edits, modifications, or adjustments to the image, please let me know."
            : "I apologize, but the image generation was not successful. To help me create a better image for you, could you please provide more specific details about what you'd like to see? For example:\n\n• What style are you looking for? (realistic, cartoon, abstract, etc.)\n• What colors or mood should the image have?\n• Are there any specific objects, people, or scenes you want included?\n• What size or format would work best for your needs?\n\nPlease share these details and I'll try generating the image again with your specifications.",
      };
    } catch (e) {
      logger.error(e);
      throw e;
    }
  },
});

export const openaiImageTool = createTool({
  name: ImageToolName,
  description: `Generate, edit, or composite images based on the conversation context. This tool automatically analyzes recent messages to create images without requiring explicit input parameters. It includes all user-uploaded images from the recent conversation and only the most recent AI-generated image to avoid confusion. Use the 'mode' parameter to specify the operation type: 'create' for new images, 'edit' for modifying existing images, or 'composite' for combining multiple images. Use this when the user requests image creation, modification, or visual content generation.`,
  inputSchema: z.object({
    mode: z
      .enum(["create", "edit", "composite"])
      .optional()
      .default("create")
      .describe(
        "Image generation mode: 'create' for new images, 'edit' for modifying existing images, 'composite' for combining multiple images",
      ),
  }),
  execute: async ({ mode }, { messages, abortSignal }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    let hasFoundImage = false;
    const latestMessages = messages
      .slice(-6)
      .reverse()
      .flatMap((m) => {
        if (m.role != "tool") return m;
        if (hasFoundImage) return m; // Skip if we already found an image)
        const fileParts = m.content.flatMap(convertToImageToolPartToImagePart);
        if (fileParts.length === 0) return m;
        hasFoundImage = true; // Mark that we found the most recent image
        return [
          {
            role: "user",
            content: fileParts,
          },
          m,
        ] as ModelMessage[];
      })
      .filter((v) => Boolean(v?.content?.length))
      .reverse() as ModelMessage[];
    const result = await generateText({
      model: openai("gpt-4.1-mini"),
      abortSignal,
      messages: latestMessages,
      tools: {
        image_generation: openai.tools.imageGeneration({
          outputFormat: "webp",
          model: "gpt-image-1-mini",
        }),
      },
      toolChoice: "required",
    });

    for (const toolResult of result.staticToolResults) {
      if (toolResult.toolName === "image_generation") {
        const base64Image = toolResult.output.result;
        return {
          images: [
            {
              url: `data:image/webp;base64,${base64Image}`,
              mimeType: "image/webp",
            },
          ],
          mode,
          model: "gpt-image-1-mini",
          guide:
            "The image has been successfully generated and is now displayed above. If you need any edits, modifications, or adjustments to the image, please let me know.",
        };
      }
    }
    return {
      images: [],
      mode,
      model: "gpt-image-1-mini",
      guide: "",
    };
  },
});

function convertToImageToolPartToImagePart(part: ToolResultPart): ImagePart[] {
  if (part.toolName !== ImageToolName) return [];
  if (!toAny(part).output?.value?.images?.length) return [];
  const result = part.output.value as ImageToolResult;
  return result.images.map((image) => ({
    type: "image",
    image: image.url,
    mediaType: image.mimeType,
  }));
}

function convertToImageToolPartToFilePart(part: ToolResultPart): FilePart[] {
  if (part.toolName !== ImageToolName) return [];
  if (!toAny(part).output?.value?.images?.length) return [];
  const result = part.output.value as ImageToolResult;
  return result.images.map((image) => ({
    type: "file",
    mediaType: image.mimeType!,
    data: image.url,
  }));
}
