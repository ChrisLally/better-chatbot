/**
 * Test Script: Fetch Langfuse Trace and Analyze Tool Calls
 *
 * Purpose: Investigate how tool calls are represented in Langfuse traces
 * and compare with Supabase tool_calls data structure.
 *
 * Usage:
 *   npx tsx src/scripts/langfuse/test-trace-fetch.ts
 */

import { createLangfuseSdkClient } from "@/src/lib/langfuse/server";
import { createClient } from "@/src/lib/supabase/client";
import { getToolCallsByStep } from "@/src/services/supabase/tool-calls-service";
import * as fs from "fs";
import * as path from "path";

// Test with a known trace ID
const TEST_TRACE_ID = "5c2da15a17a4b67245bf92527aa6e11a";

async function main() {
  console.log("🔍 Fetching trace from Langfuse...");

  // Initialize clients
  const langfuse = createLangfuseSdkClient();
  const supabase = createClient();

  // Find step with this trace_id in Supabase
  const { data: steps } = await supabase
    .from("project_task_steps")
    .select("id, name, trace_id, span_id, project_task_id")
    .eq("trace_id", TEST_TRACE_ID)
    .limit(1);

  const step = steps?.[0];
  let supabaseToolCalls = null;

  if (step) {
    supabaseToolCalls = await getToolCallsByStep(step.id, supabase);
  }

  // Fetch trace from Langfuse
  const trace = await langfuse.api.trace.get(TEST_TRACE_ID);

  // Build output object
  const output = {
    test_trace_id: TEST_TRACE_ID,
    supabase_step: step || null,
    supabase_tool_calls: supabaseToolCalls || null,
    langfuse_trace: trace,
  };

  // Save to file
  const outputPath = path.join(__dirname, "trace-output.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✅ Trace data saved to: ${outputPath}`);
}

// Run the script
main().catch(console.error);
