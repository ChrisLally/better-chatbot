# Remove Server-Only Auth Calls from Services & Hooks

**Refactoring to migrate from direct `getSupabaseUser()` calls to React Context pattern**

---

## Overview

After the Phase 4 server actions refactoring, client hooks were attempting to call server-only functions (`getSupabaseUser()`) from client components. This causes Next.js build errors:

```
Error: You're importing a component that needs "server-only". That only works
in a Server Component which is not supported in the pages/ directory.
```

**Solution:** Remove `server-only` concerns from services and hooks by:
1. Using `useAuth()` context hook in client components
2. Adding explicit `userId` parameters to service functions
3. Moving authorization checks to Server Actions (where they belong)

---

## Architecture Pattern

**Before (Problematic):**
```
Client Hook → getSupabaseUser() [SERVER-ONLY] ❌
Client Hook → Service → getSupabaseUser() [SERVER-ONLY] ❌
```

**After (Correct):**
```
Client Hook → useAuth() [Context] → user
                ↓
           Service(userId) [Pure function]
                ↓
           Server Action [Authorization check]
```

---

## Phase 1: Client Hooks - Fix Server-Only Imports (✅ COMPLETED)

### Changed Files

**4 hooks updated to use server actions instead of importing services directly:**

1. **`src/hooks/queries/use-agents.ts`** ✅
   - Changed: `selectAgents()` import → `getAgentsAction()` server action
   - Updated: Calls `getAgentsAction(filters, limit)` instead of service
   - Pattern: Uses `useAuth()` context for SWR cache key management

2. **`src/hooks/queries/use-archives.tsx`** ✅
   - Changed: `getArchivesWithItemCount()` import → `getArchivesAction()` server action
   - Updated: Calls `getArchivesAction()` instead of service
   - Pattern: Uses `useAuth()` context for SWR cache key management

3. **`src/hooks/queries/use-chat-threads.ts`** ✅
   - Changed: `getThreads()` import → `getThreadsAction()` server action
   - Updated: Calls `getThreadsAction()` instead of service
   - Pattern: No user context needed (queries all threads)

4. **`src/hooks/queries/use-workflow-tool-list.ts`** ✅
   - Changed: `getExecutableWorkflows()` import → `getExecutableWorkflowsAction()` server action
   - Updated: Calls `getExecutableWorkflowsAction()` instead of service
   - Pattern: Uses `useAuth()` context for SWR cache key management

### Key Pattern

All hooks now follow the same pattern:

```typescript
"use client";
import { useAuth } from "@/context/auth-context";
import { getDataAction } from "@/app/actions/data-actions";

export function useMyData(options?: Options) {
  const { user } = useAuth();  // Get user from context for cache key

  return useSWR(
    user ? "cache-key" : null,  // Don't fetch until user is available
    async () => {
      if (!user) return [];
      return await getDataAction(...);  // Server action handles auth + service call
    },
    options
  );
}
```

**Why this approach?**
- ✅ Avoids importing "server-only" modules in client components
- ✅ Server actions handle authentication and authorization
- ✅ Services remain pure functions without auth logic
- ✅ Clear separation between client (hooks) → server actions → services

---

## Phase 2: Service Functions - Remove Server-Only Auth Checks (🟡 IN PROGRESS)

### Why Remove Auth Checks from Services?

**Services should be pure functions that:**
- Don't know about authentication
- Take explicit parameters (userId)
- Delegate authorization to callers (Server Actions)

**Authorization checks belong in Server Actions because:**
- They enforce business rules
- They need to verify ownership/permissions
- They handle error responses to clients
- Services stay testable and reusable

### Changes Required

#### 2.1: Remove `getSupabaseUser` Imports (✅ DONE)

All 6 service files had import removed:
- ✅ `src/services/supabase/archive-service.ts`
- ✅ `src/services/supabase/bookmark-service.ts`
- ✅ `src/services/supabase/chat-service.ts`
- ✅ `src/services/supabase/storage-service.ts`
- ✅ `src/services/supabase/users-service.ts`
- ✅ `src/services/supabase/workflow-service.ts`

#### 2.2: Remove Auth Checks (✅ DONE)

Removed this pattern from all service functions:
```typescript
const currentUser = await getSupabaseUser();
if (!currentUser) {
  throw new Error("Unauthorized");
}
```

And this variant in storage-service:
```typescript
const user = await getSupabaseUser();
if (!user?.id) {
  throw new Error("Unauthorized");
}
```

#### 2.3: Add Explicit `userId` Parameters (🟡 IN PROGRESS)

**Status: Partially Complete**

✅ **archive-service.ts - FULLY FIXED**

All 6 functions updated to take `userId` parameter:
- `createArchive(userId, data)` - was `createArchive(data)`
- `updateArchive(userId, archiveId, updates)` - was `updateArchive(archiveId, updates)`
- `deleteArchive(userId, archiveId)` - was `deleteArchive(archiveId)`
- `getArchiveItems(userId, archiveId)` - was `getArchiveItems(archiveId)`
- `addArchiveItem(userId, archiveId, itemId)` - was `addArchiveItem(archiveId, itemId)`
- `removeArchiveItem(userId, archiveId, itemId)` - was `removeArchiveItem(archiveId, itemId)`

All usages in `src/app/actions/archive-actions.ts` updated to pass `user.id`.

✅ **bookmark-service.ts - FULLY FIXED**

All functions already take `userId` parameter:
- `createBookmark(userId, itemId, itemType)`
- `removeBookmark(userId, itemId, itemType)`
- `toggleBookmark(userId, itemId, itemType, isCurrentlyBookmarked)`
- `getBookmarks(userId, itemType)`
- `checkBookmark(userId, itemId, itemType)`
- `checkItemAccess(itemId, itemType, userId)`

✅ **chat-service.ts - FULLY FIXED**

Functions updated to take `userId` parameter:
- `createThread(userId, thread)` - was `createThread(thread)`
- `getMessages(userId, threadId)` - was `getMessages(threadId)`
- `createMessage(userId, message)` - was `createMessage(message)`
- `checkThreadAccess(userId, threadId)` - was `checkThreadAccess(threadId)`
- `deleteMessagesAfterMessage(userId, messageId)` - was `deleteMessagesAfterMessage(messageId)`

✅ **storage-service.ts - FULLY FIXED**

Functions updated to take `userId` parameter:
- `uploadFile(userId, file, path, bucket)` - was `uploadFile(file, path, bucket)`
- `uploadFileFromBuffer(userId, buffer, path, mimeType, bucket)` - was `uploadFileFromBuffer(buffer, path, mimeType, bucket)`
- `getSignedUploadUrl(userId, path, bucket)` - was `getSignedUploadUrl(path, bucket)`
- `listFiles(userId, prefix, bucket)` - was `listFiles(prefix, bucket)`
- `getFileMetadata(userId, path, bucket)` - was `getFileMetadata(path, bucket)`

✅ **users-service.ts - FULLY FIXED**

Functions updated to take `userId` parameter:
- `selectAgents(userId, filters, limit)` - was `selectAgents(_currentUserId, _filters, limit)`

✅ **workflow-service.ts - FULLY FIXED**

Functions updated to take `userId` parameter:
- `createWorkflow(userId, data)` - was `createWorkflow(data)`
- `executeWorkflow(userId, workflowId, input)` - was `executeWorkflow(workflowId, input)`

---

## Phase 3: Server Actions - Update All Calls (✅ COMPLETED)

**Status: All server action files updated**

### Pattern for Server Actions

Server Actions should:
1. Get user via `getSupabaseUser()` (allowed here - it's server code)
2. Perform authorization checks
3. Call service functions with explicit `userId`
4. Call `revalidateTag()` for cache sync

```typescript
export async function createArchiveAction(data) {
  const user = await getSupabaseUser();  // ✅ Server Action can use this
  if (!user) throw new Error("Unauthorized");

  // ✅ Pass userId to service
  const result = await createArchive(user.id, data);

  // ✅ Revalidate caches
  revalidateTag("archives");

  return result;
}
```

### Files to Update

| File | Status | Functions to Update |
|------|--------|-------------------|
| `src/app/actions/archive-actions.ts` | ✅ DONE | All 5 functions updated |
| `src/app/actions/bookmark-actions.ts` | ✅ DONE | All 6 functions already pass `userId` |
| `src/app/actions/chat-actions.ts` | ✅ DONE | All 5 functions updated to pass `user.id` |
| `src/app/actions/workflow-actions.ts` | ✅ DONE | All 2 functions updated to pass `user.id` |

---

## Phase 4: API Routes - Update All Calls (✅ COMPLETED)

**Status: All API route files updated**

### Additional Files Fixed

Beyond the main server actions, several API routes and tools also needed updates:

| File | Status | Changes Made |
|------|--------|--------------|
| `src/app/api/chat/route.ts` | ✅ DONE | Updated 3 service calls to pass `user.id` |
| `src/app/api/agent/chat/route.ts` | ✅ DONE | Updated 1 service call to pass `agent.id` |
| `src/app/api/chat/actions.ts` | ✅ DONE | Updated 3 service calls to pass `user.id` |
| `src/app/api/chat/export/route.ts` | ✅ DONE | Updated 1 service call to pass `user.id` |
| `src/lib/ai/tools/image/index.ts` | ✅ DONE | Skipped storage (using base64 data URLs instead) |

### Image Tool Storage Decision

For AI-generated images, we decided to **skip storage for now** and use base64 data URLs instead of persisting to Supabase Storage. This avoids the complexity of passing user context through the AI SDK's tool execution context.

**Future improvement:** When implementing persistent image storage, consider:
- Creating a factory function that binds userId to image tools
- Using a dedicated service account for AI-generated images
- Implementing a separate image management system

---

## Phase 5: Final Hook Fixes - Remove Direct Service Imports (✅ COMPLETED)

**Issue Discovered:** After initial refactoring, hooks were still importing services with `"server-only"` directives directly, causing build errors:
```
Error: You're importing a component that needs "server-only". That only works in a Server Component
```

**Solution:** Create server action wrappers for read operations and update hooks to call actions instead of services.

### New Server Actions Created:

1. **`getArchivesAction()`** in `archive-actions.ts`
   - Wraps: `getArchivesWithItemCount(userId)`
   - Used by: `use-archives.tsx`

2. **`getAgentsAction(filters, limit)`** in `agent-actions.ts`
   - Wraps: `selectAgents(userId, filters, limit)`
   - Used by: `use-agents.ts`

3. **`getExecutableWorkflowsAction()`** in `workflow-actions.ts`
   - Wraps: `getExecutableWorkflows(userId)`
   - Used by: `use-workflow-tool-list.ts`

### Hooks Updated:

| Hook File | Old Import | New Import | Fixed |
|-----------|-----------|------------|-------|
| `use-archives.tsx` | `getArchivesWithItemCount` from service | `getArchivesAction` from actions | ✅ |
| `use-agents.ts` | `selectAgents` from service | `getAgentsAction` from actions | ✅ |
| `use-chat-threads.ts` | `getThreads` from service | `getThreadsAction` from actions | ✅ |
| `use-workflow-tool-list.ts` | `getExecutableWorkflows` from service | `getExecutableWorkflowsAction` from actions | ✅ |

---

## Testing Results

✅ **Type Check:** `pnpm check-types` - PASSED (0 errors)
✅ **All services updated** with explicit `userId` parameters
✅ **All server actions updated** to pass `user.id` to services
✅ **All API routes updated** to pass authenticated user ID
✅ **Client hooks fixed** - No more direct service imports with "server-only"
✅ **Server action wrappers created** for all read operations used by hooks
✅ **Build passing** - No more "server-only" import errors

---

## Summary Table

| Component | Status | Files | Priority |
|-----------|--------|-------|----------|
| Client Hooks | ✅ DONE | 4 files | - |
| Service Imports | ✅ DONE | 6 files | - |
| Service Auth Checks | ✅ DONE | 6 files | - |
| Service `userId` Params | ✅ DONE | 6 files | - |
| Server Action Calls | ✅ DONE | 4 files | - |
| Server Action Wrappers | ✅ DONE | 3 new actions created | - |
| API Route Calls | ✅ DONE | 5 files | - |
| Type Errors | ✅ 0 errors | - | - |
| Build Status | ✅ PASSING | - | - |

---

## Commands to Run After Fixes

```bash
# Check for type errors
pnpm check-types

# Run linting
pnpm lint

# Run all tests
pnpm test

# Full check (lint + types + tests)
pnpm check
```

---

## Related Documentation

- `@/docs/PATTERNS/service-rules.md` - Service layer best practices
- `@/docs/PATTERNS/server-actions-rules.md` - Server Action patterns
- `@/docs/PATTERNS/hooks-rules.md` - Hook patterns with SWR
- `@/src/context/auth-context.tsx` - Authentication context implementation

---

## Notes

### Why This Approach?

1. **Separation of Concerns** - Services don't care about auth, Server Actions do
2. **Testability** - Services can be tested with any userId
3. **Reusability** - Services work in any context (Server Components, webhooks, etc.)
4. **Type Safety** - Explicit `userId` parameters prevent accidental misuse
5. **Context Patterns** - React Context provides user in client components cleanly

### Future Improvements

- Consider adding JSDoc comments noting which functions expect userId
- Add unit tests for services with different userIds
- Document authorization patterns in service layer
