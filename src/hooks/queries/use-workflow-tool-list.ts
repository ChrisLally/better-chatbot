"use client";
import useSWR, { SWRConfiguration } from "swr";
import { appStore } from "@/app/store";
import { selectExecuteAbilityWorkflowsAction } from "@/app/actions/workflow-actions";

export function useWorkflowToolList(options?: SWRConfiguration) {
  return useSWR("executableWorkflows", selectExecuteAbilityWorkflowsAction, {
    errorRetryCount: 0,
    revalidateOnFocus: false,
    focusThrottleInterval: 1000 * 60 * 30,
    fallbackData: [],
    onSuccess: (data) => {
      appStore.setState({ workflowToolList: data });
    },
    ...options,
  });
}
