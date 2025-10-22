import "server-only";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/supabase";
import { ChatThread, ChatMessage } from "app-types/chat";

export type ThreadRow = Tables<"chat_thread">;
export type MessageRow = Tables<"chat_message">;

export type ThreadWithLastMessage = ThreadRow & {
  lastMessageAt: number;
};

/**
 * Convert database row to ChatThread type
 */
function threadRowToChatThread(row: ThreadRow): ChatThread {
  return {
    id: row.id,
    title: row.title,
    userId: row.user_id || "",
    createdAt: new Date(row.created_at),
  };
}

/**
 * Convert database row to ChatMessage type
 */
function messageRowToChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role as any,
    parts: row.parts as any,
    metadata: row.metadata as any,
    createdAt: new Date(row.created_at),
  };
}

// ============================================================================
// THREAD OPERATIONS
// ============================================================================

/**
 * Get all threads for the current user with last message timestamp
 */
export async function getThreads(): Promise<ThreadWithLastMessage[]> {
  const supabase = await createClient();

  const { data: threads, error } = await supabase
    .from("chat_thread")
    .select(`
      *,
      chat_message!inner(created_at)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching threads:", error);
    throw new Error("Failed to fetch threads");
  }

  // Transform the data to include lastMessageAt
  const threadsWithLastMessage =
    threads?.map((thread) => {
      const messages = (thread as any).chat_message as MessageRow[];
      const lastMessage = messages.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];

      return {
        ...thread,
        lastMessageAt: lastMessage
          ? new Date(lastMessage.created_at).getTime()
          : 0,
        chat_message: undefined, // Remove the messages array
      };
    }) || [];

  return threadsWithLastMessage;
}

/**
 * Get a single thread by ID
 */
export async function getThread(threadId: string): Promise<ChatThread | null> {
  const supabase = await createClient();

  const { data: thread, error } = await supabase
    .from("chat_thread")
    .select("*")
    .eq("id", threadId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Thread not found
    }
    console.error("Error fetching thread:", error);
    throw new Error("Failed to fetch thread");
  }

  return thread ? threadRowToChatThread(thread) : null;
}

/**
 * Get a thread with all its messages
 */
export async function getThreadWithMessages(
  threadId: string,
): Promise<(ChatThread & { messages: ChatMessage[] }) | null> {
  const supabase = await createClient();

  // First get the thread
  const { data: thread, error: threadError } = await supabase
    .from("chat_thread")
    .select("*")
    .eq("id", threadId)
    .single();

  if (threadError) {
    if (threadError.code === "PGRST116") {
      return null; // Thread not found
    }
    console.error("Error fetching thread:", threadError);
    throw new Error("Failed to fetch thread");
  }

  if (!thread) {
    return null;
  }

  // Get all messages for the thread
  const { data: messages, error: messagesError } = await supabase
    .from("chat_message")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
    throw new Error("Failed to fetch messages");
  }

  return {
    ...threadRowToChatThread(thread),
    messages: messages?.map(messageRowToChatMessage) || [],
  };
}

/**
 * Create a new thread
 */
export async function createThread(
  userId: string,
  thread: Omit<ChatThread, "createdAt"> & { id?: string },
): Promise<ChatThread> {
  const supabase = await createClient();

  const insertData: any = {
    title: thread.title,
    user_id: userId,
  };

  // Include id if provided
  if (thread.id) {
    insertData.id = thread.id;
  }

  const { data, error } = await supabase
    .from("chat_thread")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error creating thread:", error);
    throw new Error("Failed to create thread");
  }

  return threadRowToChatThread(data);
}

/**
 * Update a thread
 */
export async function updateThread(
  threadId: string,
  updates: Partial<Omit<ChatThread, "id" | "createdAt" | "userId">>,
): Promise<ChatThread> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_thread")
    .update({
      title: updates.title,
    })
    .eq("id", threadId)
    .select()
    .single();

  if (error) {
    console.error("Error updating thread:", error);
    throw new Error("Failed to update thread");
  }

  return threadRowToChatThread(data);
}

/**
 * Delete a thread
 */
export async function deleteThread(threadId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_thread")
    .delete()
    .eq("id", threadId);

  if (error) {
    console.error("Error deleting thread:", error);
    throw new Error("Failed to delete thread");
  }
}

/**
 * Delete all threads for the current user
 */
export async function deleteAllThreads(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("chat_thread").delete();

  if (error) {
    console.error("Error deleting all threads:", error);
    throw new Error("Failed to delete all threads");
  }
}

/**
 * Check if user has access to a thread
 */
export async function checkThreadAccess(
  userId: string,
  threadId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_thread")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", userId) // Add user_id check for access control
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking thread access:", error);
    throw new Error("Failed to check thread access");
  }

  return !!data;
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Get messages for a thread
 */
export async function getMessages(
  userId: string,
  threadId: string,
): Promise<ChatMessage[]> {
  const supabase = await createClient();

  const hasAccess = await checkThreadAccess(userId, threadId);
  if (!hasAccess) {
    throw new Error("Access denied to thread");
  }

  const { data: messages, error } = await supabase
    .from("chat_message")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    throw new Error("Failed to fetch messages");
  }

  return messages?.map(messageRowToChatMessage) || [];
}

/**
 * Create a new message
 */
export async function createMessage(
  userId: string,
  message: Omit<ChatMessage, "createdAt">, // Keep id, AI SDK provides it
): Promise<ChatMessage> {
  const supabase = await createClient();

  const hasAccess = await checkThreadAccess(userId, message.threadId);
  if (!hasAccess) {
    throw new Error("Access denied to thread");
  }

  const { data, error } = await supabase
    .from("chat_message")
    .insert({
      id: message.id, // Messages have explicit IDs from AI SDK
      thread_id: message.threadId,
      role: message.role,
      parts: message.parts as any,
      metadata: message.metadata as any,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating message:", error);
    throw new Error("Failed to create message");
  }

  return messageRowToChatMessage(data);
}

/**
 * Update a message
 */
export async function updateMessage(
  messageId: string,
  updates: Partial<Omit<ChatMessage, "id" | "createdAt" | "threadId">>,
): Promise<ChatMessage> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_message")
    .update({
      role: updates.role,
      parts: updates.parts as any,
      metadata: updates.metadata as any,
    })
    .eq("id", messageId)
    .select()
    .single();

  if (error) {
    console.error("Error updating message:", error);
    throw new Error("Failed to update message");
  }

  return messageRowToChatMessage(data);
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_message")
    .delete()
    .eq("id", messageId);

  if (error) {
    console.error("Error deleting message:", error);
    throw new Error("Failed to delete message");
  }
}

/**
 * Delete all messages after a specific message ID in a thread
 */
export async function deleteMessagesAfterMessage(
  userId: string,
  messageId: string,
): Promise<void> {
  const supabase = await createClient();

  // First get the message to find its thread and timestamp
  const { data: message, error: fetchError } = await supabase
    .from("chat_message")
    .select("thread_id, created_at")
    .eq("id", messageId)
    .single();

  if (fetchError) {
    console.error("Error fetching message:", fetchError);
    throw new Error("Failed to fetch message");
  }

  if (!message) {
    return;
  }

  const hasAccess = await checkThreadAccess(userId, message.thread_id);
  if (!hasAccess) {
    throw new Error("Access denied to thread");
  }

  const { error } = await supabase
    .from("chat_message")
    .delete()
    .eq("thread_id", message.thread_id)
    .gt("created_at", message.created_at);

  if (error) {
    console.error("Error deleting messages after message:", error);
    throw new Error("Failed to delete messages");
  }
}
