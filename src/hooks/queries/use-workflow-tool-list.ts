"use client";
import useSWR, { SWRConfiguration } from "swr";
import { appStore } from "@/app/store";
import { getExecutableWorkflowsAction } from "@/app/actions/workflow-actions";
import { useAuth } from "@/context/auth-context";

export function useWorkflowToolList(options?: SWRConfiguration) {
  const { user } = useAuth();

  return useSWR(
    user ? "executableWorkflows" : null,
    async () => {
      if (!user) {
        return [];
      }
      return await getExecutableWorkflowsAction();
    },
    {
      errorRetryCount: 0,
      revalidateOnFocus: false,
      focusThrottleInterval: 1000 * 60 * 30,
      fallbackData: [],
      onSuccess: (data) => {
        appStore.setState({ workflowToolList: data });
      },
      ...options,
    },
  );
}
