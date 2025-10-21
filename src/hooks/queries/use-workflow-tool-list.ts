"use client";
import useSWR, { SWRConfiguration } from "swr";
import { appStore } from "@/app/store";
import { getExecutableWorkflows } from "@/services/supabase/workflow-service";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";

export function useWorkflowToolList(options?: SWRConfiguration) {
  return useSWR(
    "executableWorkflows",
    async () => {
      const user = await getSupabaseUser();
      if (!user) {
        return [];
      }
      return await getExecutableWorkflows(user.id);
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
