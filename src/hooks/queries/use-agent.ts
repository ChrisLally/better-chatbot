"use client";
import { Agent } from "app-types/agent";
import useSWR, { SWRConfiguration } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { getAgentAction } from "@/app/actions/agent-actions";

interface UseAgentOptions extends SWRConfiguration {
  enabled?: boolean;
}

export function useAgent(
  agentId: string | null | undefined,
  options: UseAgentOptions = {},
) {
  const { enabled = true, ...swrOptions } = options;

  const {
    data: agent,
    error,
    isLoading,
    mutate,
  } = useSWR<Agent | null>(
    agentId && enabled ? `agent-${agentId}` : null,
    async (id: string) => getAgentAction(id),
    {
      errorRetryCount: 0,
      revalidateOnFocus: false,
      onError: handleErrorWithToast,
      ...swrOptions,
    },
  );

  return {
    agent,
    isLoading,
    error,
    mutate,
  };
}
