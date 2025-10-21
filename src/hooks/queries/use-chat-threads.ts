"use client";

import useSWR from "swr";
import {
  getThreadsAction,
  ThreadWithLastMessage,
} from "@/app/actions/chat-actions";

export function useChatThreads() {
  return useSWR<ThreadWithLastMessage[]>(
    "chat-threads",
    () => getThreadsAction(),
    {
      fallbackData: [],
      revalidateOnFocus: false,
    },
  );
}
