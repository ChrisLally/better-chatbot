import "server-only";
import { customModelProvider } from "@/lib/ai/models";

/**
 * Get information about all available AI models
 * Models are sorted with those having API keys first
 * @returns Sorted array of model info with provider, models, and API key status
 */
export function getModelsInfo() {
  return customModelProvider.modelsInfo.sort((a, b) => {
    if (a.hasAPIKey && !b.hasAPIKey) return -1;
    if (!a.hasAPIKey && b.hasAPIKey) return 1;
    return 0;
  });
}
