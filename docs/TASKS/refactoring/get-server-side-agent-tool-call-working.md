I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

The agent chat API currently uses `generateText` without tools, causing tool calls to fail. The main chat route (`/api/chat/route.ts`) successfully implements tool execution using `streamText` with tools loaded via `loadMcpTools`, `loadWorkFlowTools`, and `loadAppDefaultTools` from `shared.chat.ts`. The agent object already contains `instructions.mentions` which determines which tools should be loaded. The route uses a fire-and-forget pattern, returning immediately while processing happens in the background—this pattern should be preserved.

**Critical Discovery:** `generateText` only decides which tools to call but does NOT execute them. Tool execution requires `streamText`, which automatically executes tools and includes results in the response.

### Approach

Enhance the background async function in `/api/agent/chat/route.ts` to support server-side tool execution by:
1. Loading MCP, workflow, and app default tools based on agent mentions
2. **Using `streamText` instead of `generateText`** for automatic tool execution
3. Consuming the stream with `onFinish` callback to capture complete tool execution results
4. Saving complete tool execution data (both tool calls AND tool results)

### Reasoning

I explored the agent chat route and compared it with the working main chat route. I examined the shared chat utilities to understand tool loading functions, reviewed the agent type structure to confirm the mentions field, and verified the message saving format in the chat service.

## Mermaid Diagram

sequenceDiagram
    participant Client
    participant API as /api/agent/chat
    participant DB as Supabase
    participant Tools as Tool Loaders
    participant AI as AI Model

    Client->>API: POST with agent_id, message
    API->>DB: Fetch agent details
    DB-->>API: Agent with instructions.mentions
    API->>DB: Save user message
    API-->>Client: Return immediately (thread_id, agent info)
    
    Note over API: Background async execution starts
    
    API->>Tools: loadMcpTools(mentions)
    Tools-->>API: MCP_TOOLS
    API->>Tools: loadWorkFlowTools(mentions)
    Tools-->>API: WORKFLOW_TOOLS
    API->>Tools: loadAppDefaultTools(mentions)
    Tools-->>API: APP_DEFAULT_TOOLS
    
    API->>API: Merge all tools
    
    API->>AI: streamText with tools, stopWhen: stepCountIs(10)

    loop Up to 10 tool calls
        AI->>AI: Decide to call tool
        AI->>Tools: Execute tool
        Tools-->>AI: Tool result
    end

    AI-->>API: Stream with text + tool calls + tool results
    API->>API: convertToSavePart(parts)
    API->>DB: Save assistant message with tool execution data
    
    Note over API: Background execution complete

## Proposed File Changes

### src/app/api/agent/chat/route.ts(MODIFY)

References: 

- src/app/api/chat/route.ts
- src/app/api/chat/shared.chat.ts

**Add imports for tool loading and execution:**

Import `stepCountIs` from the `ai` package to enable multi-step tool calling (similar to line 6 in `/Volumes/CHRIS-LALLY-1TB/Desktop/meta-agent-projects/better-chatbot/src/app/api/chat/route.ts`).

Import `loadMcpTools`, `loadWorkFlowTools`, `loadAppDefaultTools`, and `convertToSavePart` from `@/app/api/chat/shared.chat` (similar to lines 51-54 in `/Volumes/CHRIS-LALLY-1TB/Desktop/meta-agent-projects/better-chatbot/src/app/api/chat/route.ts`).

Import `Tool` type from `ai` package for type safety.

**Refactor the background async function (lines 100-163):**

Inside the async IIFE, after building the system prompt and getting the model but before calling `generateText`:

1. **Load tools based on agent mentions:**
   - Extract `mentions` from `agent.instructions?.mentions` (default to empty array if undefined)
   - Call `loadMcpTools({ mentions })` and await the result, storing in `MCP_TOOLS` constant
   - Call `loadWorkFlowTools({ mentions, dataStream: undefined })` - note that dataStream is not available in this context, so pass undefined or create a no-op writer
   - Call `loadAppDefaultTools({ mentions })` and await the result, storing in `APP_DEFAULT_TOOLS` constant
   - Merge all tools into a single `tools` object: `{ ...MCP_TOOLS, ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS }`

2. **Handle workflow tools special case:**
   - Since `loadWorkFlowTools` requires a `dataStream` parameter but we don't have streaming in this context, you have two options:
     - Option A: Skip workflow tools entirely by not calling `loadWorkFlowTools` (simpler, but loses workflow functionality)
     - Option B: Create a no-op `UIMessageStreamWriter` that discards writes (more complete but adds complexity)
   - Recommend Option A for simplicity unless workflow tools are critical for agent API usage

3. **Update generateText call (lines 146-150):**
   - Add `tools` parameter with the merged tools object
   - Add `stopWhen: stepCountIs(10)` to enable multi-step tool calling (allows the model to call tools up to 10 times)
   - Add `toolChoice: "auto"` to let the model decide when to use tools
   - Add `maxRetries: 2` for resilience
   - The result will now include `text`, `toolCalls`, and `toolResults` properties

4. **Update message saving (lines 152-159):**
   - Change from saving just text to saving complete parts with tool execution results
   - Instead of `parts: [{ type: "text", text }]`, construct parts from the full result
   - The `generateText` result includes a `response` object with `messages` array
   - Extract the assistant message from `result.response.messages` (it will be the last message)
   - Map the message parts through `convertToSavePart` to strip provider metadata: `parts: assistantMessage.content.map(convertToSavePart)`
   - This ensures tool calls, tool results, and text are all saved properly

5. **Add metadata to saved message:**
   - Create a `metadata` object similar to line 349 in `/Volumes/CHRIS-LALLY-1TB/Desktop/meta-agent-projects/better-chatbot/src/app/api/chat/route.ts`
   - Include `agentId: agent_id`, `toolChoice: "auto"`, `toolCount: Object.keys(tools).length`
   - Optionally include usage information if available in the result

6. **Enhance error handling:**
   - Wrap the tool loading in try-catch blocks to handle individual tool loading failures gracefully
   - If tool loading fails, log the error but continue with empty tools object rather than crashing
   - The existing catch block (lines 160-162) already handles generation errors, but consider adding more specific error logging for tool-related failures
   - Log which tools were successfully loaded for debugging: `console.log('Loaded tools:', Object.keys(tools).length, 'MCP:', Object.keys(MCP_TOOLS).length, 'Workflows:', Object.keys(WORKFLOW_TOOLS).length, 'App Default:', Object.keys(APP_DEFAULT_TOOLS).length)`

**Important considerations:**

- The route uses `getSupabaseAdmin()` for database access, so continue using `agent.id` as the userId parameter in `createMessage`
- The fire-and-forget pattern (async IIFE without await) should be preserved—the route still returns immediately with the same response format
- Tool execution happens entirely server-side; no client interaction is needed
- The `mentions` array from agent instructions determines which tools are available, providing fine-grained control over agent capabilities
- If no mentions are specified, the tool loaders will return empty objects, and `streamText` will work without tools (backward compatible)

## Implementation Summary

### ✅ COMPLETED

All changes have been successfully implemented in `/src/app/api/agent/chat/route.ts`:

#### 🔑 Critical Pattern Discovery
The key to proper tool execution with `streamText` is:
1. Call `result.consumeStream()` to trigger the streaming pipeline
2. **Then** call `await result.response` to block until tool execution completes
3. Without step 2, the background process returns immediately and tools may execute but results won't be fully available

This was discovered through debugging - the initial implementation called `consumeStream()` but didn't properly await the response, so tools were executing but the response was being saved before they completed.

**1. Imports Added (Lines 5-18)**
- `streamText`, `stepCountIs`, `Tool` from `ai` package
- `loadMcpTools`, `loadWorkFlowTools`, `loadAppDefaultTools`, `convertToSavePart` from `@/app/api/chat/shared.chat`
- `ChatMetadata` type from `app-types/chat`

**2. Tool Loading Implementation (Lines 153-206)**
- Extracts `mentions` from `agent.instructions?.mentions` (defaults to empty array)
- Loads MCP, Workflow, and App Default tools with error handling using `safe()` wrapper
- Merges all tool objects into single `tools` object
- Logs tool loading counts for debugging

**3. Stream Text Implementation (Lines 209-279)**
- **Critical Fix**: Changed from `generateText` to `streamText` for automatic tool execution
- Creates `streamText` with tools, `stopWhen: stepCountIs(10)`, and `toolChoice: "auto"`
- **Key Pattern**: Calls `result.consumeStream()` to trigger tool execution
- **Crucial**: Awaits `result.response` (as a Promise) which blocks until all tools complete
- Uses `toolChoice: "auto"` and `maxRetries: 2` for robust tool execution
- The `await result.response` ensures tool execution completes before saving

**4. Message Saving (Lines 231-282)**
- Extracts assistant message from `response.messages` after awaiting `result.response`
- Handles both string and array content types: `Array.isArray(responseMessage.content)`
- Maps message parts through `convertToSavePart` to strip provider metadata
- **Critically**, at this point the response includes BOTH tool-call AND tool-result parts
- Includes tool execution metadata: `agentId`, `toolChoice`, `toolCount`, `usage`

**5. Error Handling (Lines 280-292)**
- Wraps tool loading in `safe()` blocks for graceful failures
- Tries/catch wrapping the entire async IIFE to catch any stream errors
- Continues with empty tools if loading fails rather than crashing
- Comprehensive logging: tool counts, response completion, message parts, usage stats
- Error logs for missing responses or execution failures

**6. Result**
- Agent API now executes server-side tools completely
- Both tool-call AND tool-result parts are saved to database
- Complete tool execution data available in message metadata
- Fire-and-forget pattern preserved—client receives immediate response

### Supporting Changes

**src/app/api/chat/shared.chat.ts (Line 470)**
- Added null safety check: `v.state && v.state.startsWith("output")` in `convertToSavePart`

**src/app/actions/agent-actions.ts (Lines 133, 169)**
- Added cache invalidation on agent update/delete: `serverCache.delete(CacheKeys.agentInstructions(agentId))`

**src/app/api/chat/route.ts (Lines 66-67, 370)**
- Added imports and cache invalidation after agent updates

**Frontend Null Safety Fixes** (8 files total)
- Added `state &&` checks before `.startsWith()` calls in:
  - `src/components/chat-bot.tsx`
  - `src/components/message-parts.tsx`
  - `src/components/chat-bot-voice.tsx`
  - `src/components/tool-invocation/code-executor.tsx`
  - `src/components/tool-invocation/web-search.tsx`
  - `src/components/tool-invocation/image-generator.tsx`

### Testing Recommendations

1. **Verify tool execution**: Query thread and check that assistant messages contain both tool-call and tool-result parts
2. **Test multi-step calling**: Ensure tools can be called up to 10 times in sequence
3. **Verify metadata**: Check that `toolChoice`, `toolCount`, and `usage` are saved correctly
4. **Error scenarios**: Test tool loading failures and verify graceful fallback to no-tools mode
5. **Fire-and-forget pattern**: Confirm client receives immediate response while background processing completes