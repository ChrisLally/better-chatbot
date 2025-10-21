"use client";

import useSWR from "swr";
import { ThreadWithLastMessage } from "@/app/actions/chat-actions";
import { getThreads as getThreadsService } from "@/services/supabase/chat-service";

export function useChatThreads() {
  return useSWR<ThreadWithLastMessage[]>(
    "chat-threads",
    () => getThreadsService(),
    {
      fallbackData: [],
      revalidateOnFocus: false,
    },
  );
}
