# Agent API Routes

API endpoints for managing and interacting with agents in the system.

---

## Overview

The Agent API provides external access to:
- **List agents** - Get all available agents for the current user
- **Chat with agents** - Send messages to agents and receive streamed responses

All routes require API key authentication using a temporary key (hardcoded for now).

---

## Routes

### POST /api/agent/list

Get a list of all available agents for the authenticated user.

#### Authentication
- **Required**: `api_key` parameter
- **Current**: Hardcoded check against `"temp_api_key"`
- **Method**: Query parameter, header, or request body

#### Request

**POST (with body)**:
```bash
curl -X POST http://localhost:3000/api/agent/list \
  -H "Content-Type: application/json" \
  -d '{"api_key": "temp_api_key"}'
```

**GET (with query param)**:
```bash
curl http://localhost:3000/api/agent/list?api_key=temp_api_key
```

**GET (with header)**:
```bash
curl http://localhost:3000/api/agent/list \
  -H "x-api-key: temp_api_key"
```

#### Request Body (POST only)
```json
{
  "api_key": "temp_api_key"
}
```

#### Query Parameters (GET only)
- `api_key` - API key for authentication (optional, can use header instead)

#### Headers (GET only)
- `x-api-key` - API key for authentication (alternative to query param)

#### Response (200 OK)
```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid-string",
      "name": "Agent Name",
      "description": "Agent description",
      "visibility": "private|public|readonly"
    }
  ],
  "count": 1
}
```

#### Error Responses

**401 Unauthorized - Invalid API Key**:
```json
{
  "error": "Invalid API key"
}
```

**401 Unauthorized - Not Authenticated**:
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

#### Implementation Details
- Supports both POST and GET methods
- Uses current user context via `getSupabaseUser()`
- Calls `selectAgents(userId, ["all"], 100)` to fetch agents
- Returns simplified agent info (id, name, description, visibility)
- Limits to 100 agents per request

#### Notes
- Requires authenticated user session
- Currently returns agents accessible to current user
- API key check is hardcoded and should be replaced with proper authentication in production

---

### POST /api/agent/chat

Send a message to an agent and receive a streamed response.

#### Authentication
- **Required**: `api_key` parameter in request body
- **Current**: Hardcoded check against `"temp_api_key"`

#### Request

```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "temp_api_key",
    "agent_id": "agent-uuid",
    "message": "Hello, agent!",
    "thread_id": "optional-thread-uuid"
  }'
```

#### Request Body
```json
{
  "api_key": "temp_api_key",
  "agent_id": "required-agent-uuid",
  "message": "User message text",
  "thread_id": "optional-existing-thread-uuid"
}
```

**Required Fields**:
- `api_key` - API key for authentication
- `agent_id` - UUID of the agent to chat with
- `message` - User message text

**Optional Fields**:
- `thread_id` - Existing thread ID to continue conversation (generates new UUID if not provided)

#### Response (200 OK - Streaming)
Returns a Server-Sent Events (SSE) stream with the agent's response:

```
data: {"type":"text-delta","text":"The agent's"}
data: {"type":"text-delta","text":" response"}
data: {"type":"text-delta","text":" here"}
...
```

#### Error Responses

**400 Bad Request - Missing Required Fields**:
```json
{
  "error": "agent_id and message are required"
}
```

**401 Unauthorized - Invalid API Key**:
```json
{
  "error": "Invalid API key"
}
```

**404 Not Found - Agent Not Found**:
```json
{
  "error": "Agent not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

#### Implementation Details

**Agent Fetching**:
- Uses admin Supabase client (no user auth required for API access)
- Queries `users` table where `user_type = "agent"`
- Fetches: id, name, description, icon, instructions, visibility, timestamps
- Converts to internal Agent type

**Thread Management**:
- Creates new thread if `thread_id` not provided (using UUID)
- Checks for existing thread in `chat_thread` table
- Creates thread record if it doesn't exist
- Uses agent's ID as thread `user_id`

**Message Flow**:
1. Saves user message to `chat_message` table
2. Builds system prompt using agent instructions via `buildUserSystemPrompt()`
3. Gets GPT-4 model via `customModelProvider`
4. Streams response using `streamText()` from AI SDK
5. Asynchronously saves assistant message to database (with 1s delay)

**Conversation Context**:
- System prompt includes agent instructions
- User message tagged with `agentId` in metadata
- Assistant message tagged with `agentId` in metadata
- Messages stored in `chat_message` table with `role` ("user" or "assistant")

#### Notes
- Returns `toUIMessageStreamResponse()` for SSE streaming
- Assistant message saving uses `setTimeout` (production should use webhooks/queues)
- No user context passed to system prompt (API calls treated as anonymous)
- Currently hardcoded to use GPT-4 model
- Thread and message records created in Supabase for persistence

---

## Common Use Cases

### Get Agent List
1. Authenticate with API key
2. Call POST `/api/agent/list` or GET `/api/agent/list`
3. Parse returned agent array
4. Use `agent.id` for subsequent calls

### Start New Conversation
1. Get agent ID from list endpoint
2. Call POST `/api/agent/chat` without `thread_id`
3. Stream response and handle SSE events
4. Save returned `thread_id` for follow-ups

### Continue Existing Conversation
1. Call POST `/api/agent/chat` with existing `thread_id`
2. Agent receives full conversation context
3. Stream response handles new message

---

## Security Considerations

⚠️ **Current Implementation**:
- API key is hardcoded (`"temp_api_key"`)
- Should be replaced with proper API key validation
- Consider rate limiting for production
- Validate agent IDs to prevent unauthorized access
- Sanitize message content

**Recommended Improvements**:
- Use dedicated API key management system
- Implement proper rate limiting
- Add request validation and sanitization
- Log all API calls for audit trail
- Consider JWT tokens or OAuth for better security

---

## Development Notes

### Known Issues / TODOs
- **Hardcoded API key**: Replace with proper authentication
- **Assistant message timing**: Uses `setTimeout` instead of reliable queue
- **Model selection**: Hardcoded to GPT-4, should be configurable
- **Thread lifecycle**: No cleanup of old threads
- **Error handling**: Could be more granular

### Related Services
- `getSupabaseAdmin()` - Admin Supabase client from `lib/supabase/server-admin`
- `getSupabaseUser()` - User Supabase client from `lib/supabase/auth-helpers`
- `selectAgents()` - Agent query from `services/supabase/users-service`
- `createMessage()` - Message creation from `services/supabase/chat-service`
- `buildUserSystemPrompt()` - System prompt builder from `lib/ai/prompts`
- `customModelProvider` - Model provider from `lib/ai/models`
- `streamText()` - AI SDK streaming from `ai` package

### Database Tables
- `users` - Agent data stored with `user_type = "agent"`
- `chat_thread` - Conversation threads
- `chat_message` - Individual messages with role and parts

---

## Examples

### Python Client Example
```python
import requests
import json

API_KEY = "temp_api_key"
BASE_URL = "http://localhost:3000/api/agent"

# Get agents
response = requests.post(f"{BASE_URL}/list", json={"api_key": API_KEY})
agents = response.json()["agents"]
print(f"Available agents: {[a['name'] for a in agents]}")

# Chat with agent
agent_id = agents[0]["id"]
response = requests.post(
    f"{BASE_URL}/chat",
    json={
        "api_key": API_KEY,
        "agent_id": agent_id,
        "message": "Hello!"
    },
    stream=True
)

# Handle streaming response
for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

### JavaScript/Node Client Example
```javascript
const API_KEY = "temp_api_key";
const BASE_URL = "http://localhost:3000/api/agent";

// Get agents
async function getAgents() {
  const response = await fetch(`${BASE_URL}/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: API_KEY })
  });
  return response.json();
}

// Chat with agent
async function chatWithAgent(agentId, message, threadId) {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: API_KEY,
      agent_id: agentId,
      message,
      thread_id: threadId
    })
  });

  // Handle SSE stream
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(new TextDecoder().decode(value));
  }
}
```

---

## See Also

- [Agent Architecture Patterns](docs/PATTERNS/artifact-rules)
- [API Route Best Practices](docs/PATTERNS/server-actions-rules)
- [Supabase Service Rules](docs/PATTERNS/services/supabase-service-rules)
