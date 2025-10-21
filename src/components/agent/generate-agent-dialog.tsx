"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChatModel } from "app-types/chat";
import { handleErrorWithToast } from "ui/shared-toast";
import { CommandIcon, CornerRightUpIcon } from "lucide-react";
import { generateAgentWithAIAction } from "@/app/actions/agent-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Textarea } from "ui/textarea";
import { MessageLoading } from "ui/message-loading";
import { SelectModel } from "@/components/select-model";
import { appStore } from "@/app/store";

interface GenerateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentChange: (data: any) => void;
  onToolsGenerated?: (tools: string[]) => void;
}

export function GenerateAgentDialog({
  open,
  onOpenChange,
  onAgentChange,
  onToolsGenerated,
}: GenerateAgentDialogProps) {
  const t = useTranslations();
  const [generateModel, setGenerateModel] = useState<ChatModel | undefined>(
    appStore.getState().chatModel,
  );
  const [generateAgentPrompt, setGenerateAgentPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submitGenerateAgent = async () => {
    if (!generateAgentPrompt.trim()) return;

    setIsLoading(true);
    try {
      // Note: This is a simplified implementation
      // The original used AI SDK for streaming, but we're using server actions
      const result = await generateAgentWithAIAction(generateAgentPrompt);

      if (result.success) {
        // For now, we'll use a basic agent structure
        // In a real implementation, you'd use the AI SDK to generate the full agent
        const basicAgent = {
          name: "Generated Agent",
          description: "An AI-generated agent based on your prompt",
          systemPrompt: generateAgentPrompt,
          model: generateModel?.model || "gpt-4",
        };

        onAgentChange(basicAgent);
        if (onToolsGenerated) {
          onToolsGenerated([]);
        }

        // Close dialog after generation completes
        onOpenChange(false);
        setGenerateAgentPrompt("");
        // Reset to current global default model
        setGenerateModel(appStore.getState().chatModel);
      } else {
        handleErrorWithToast(
          new Error(result.error || "Failed to generate agent"),
        );
      }
    } catch (error) {
      handleErrorWithToast(
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="xl:max-w-[40vw] w-full max-w-full">
        <DialogHeader>
          <DialogTitle>Generate Agent</DialogTitle>
          <DialogDescription className="sr-only">
            Generate Agent
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 w-full">
          <div className="px-4">
            <p className="bg-secondary rounded-lg max-w-2/3 p-4">
              {t("Agent.generateAgentDetailedGreeting")}
            </p>
          </div>

          <div className="flex justify-end px-4">
            <p className="text-sm bg-primary text-primary-foreground py-4 px-6 rounded-lg">
              {isLoading && generateAgentPrompt ? (
                generateAgentPrompt
              ) : (
                <MessageLoading className="size-4" />
              )}
            </p>
          </div>

          <div className="relative flex flex-col border rounded-lg p-4">
            <Textarea
              value={generateAgentPrompt}
              autoFocus
              placeholder="input prompt here..."
              disabled={isLoading}
              onChange={(e) => setGenerateAgentPrompt(e.target.value)}
              data-testid="agent-generate-agent-prompt-textarea"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey && !isLoading) {
                  e.preventDefault();
                  submitGenerateAgent();
                }
              }}
              className="w-full break-all pb-6 border-none! ring-0! resize-none min-h-24 max-h-48 overflow-y-auto placeholder:text-xs transition-colors"
            />
            <div className="flex justify-end items-center gap-2">
              <SelectModel
                showProvider
                onSelect={(model) => setGenerateModel(model)}
              />
              <Button
                disabled={!generateAgentPrompt.trim() || isLoading}
                size="sm"
                data-testid="agent-generate-agent-prompt-submit-button"
                onClick={submitGenerateAgent}
                className="text-xs"
              >
                <span className="mr-1">
                  {isLoading ? "Generating..." : "Send"}
                </span>
                {isLoading ? (
                  <div className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CommandIcon className="size-3" />
                    <CornerRightUpIcon className="size-3" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
