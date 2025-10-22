"use client";

import useSWR from "swr";
import {
  ThreadWithLastMessage,
  getThreadsAction,
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
