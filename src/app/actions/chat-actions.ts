"use server";

import {
  getThreads as getThreadsService,
  getThread as getThreadService,
  getThreadWithMessages as getThreadWithMessagesService,
  createThread as createThreadService,
  updateThread as updateThreadService,
  deleteThread as deleteThreadService,
  deleteAllThreads as deleteAllThreadsService,
  checkThreadAccess as checkThreadAccessService,
  getMessages as getMessagesService,
  createMessage as createMessageService,
  updateMessage as updateMessageService,
  deleteMessage as deleteMessageService,
  deleteMessagesAfterMessage as deleteMessagesAfterMessageService,
  ThreadWithLastMessage,
} from "@/services/supabase/chat-service";
import { ChatThread, ChatMessage } from "app-types/chat";

// Re-export the type
export type { ThreadWithLastMessage };

// ============================================================================
// THREAD ACTIONS
// ============================================================================

/**
 * Get all threads for the current user
 */
export async function getThreadsAction(): Promise<ThreadWithLastMessage[]> {
  return getThreadsService();
}

/**
 * Get a single thread by ID
 */
export async function getThreadAction(
  threadId: string,
): Promise<ChatThread | null> {
  return getThreadService(threadId);
}

/**
 * Get a thread with all its messages
 */
export async function getThreadWithMessagesAction(
  threadId: string,
): Promise<(ChatThread & { messages: ChatMessage[] }) | null> {
  return getThreadWithMessagesService(threadId);
}

/**
 * Create a new thread
 */
export async function createThreadAction(
  thread: Omit<ChatThread, "createdAt"> & { id?: string },
): Promise<ChatThread> {
  return createThreadService(thread);
}

/**
 * Update a thread
 */
export async function updateThreadAction(
  threadId: string,
  updates: Partial<Omit<ChatThread, "id" | "createdAt" | "userId">>,
): Promise<ChatThread> {
  return updateThreadService(threadId, updates);
}

/**
 * Delete a thread
 */
export async function deleteThreadAction(threadId: string): Promise<void> {
  return deleteThreadService(threadId);
}

/**
 * Delete all threads for the current user
 */
export async function deleteAllThreadsAction(): Promise<void> {
  return deleteAllThreadsService();
}

/**
 * Check if user has access to a thread
 */
export async function checkThreadAccessAction(
  threadId: string,
): Promise<boolean> {
  return checkThreadAccessService(threadId);
}

// ============================================================================
// MESSAGE ACTIONS
// ============================================================================

/**
 * Get messages for a thread
 */
export async function getMessagesAction(
  threadId: string,
): Promise<ChatMessage[]> {
  return getMessagesService(threadId);
}

/**
 * Create a new message
 */
export async function createMessageAction(
  message: Omit<ChatMessage, "createdAt">,
): Promise<ChatMessage> {
  return createMessageService(message);
}

/**
 * Update a message
 */
export async function updateMessageAction(
  messageId: string,
  updates: Partial<Omit<ChatMessage, "id" | "createdAt" | "threadId">>,
): Promise<ChatMessage> {
  return updateMessageService(messageId, updates);
}

/**
 * Delete a message
 */
export async function deleteMessageAction(messageId: string): Promise<void> {
  return deleteMessageService(messageId);
}

/**
 * Delete all messages after a specific message ID in a thread
 */
export async function deleteMessagesAfterMessageAction(
  messageId: string,
): Promise<void> {
  return deleteMessagesAfterMessageService(messageId);
}
