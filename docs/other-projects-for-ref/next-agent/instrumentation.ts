import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  shouldExportSpan: (span) =>
    span.otelSpan.instrumentationScope.name !== "next.js",
});

export async function register() {
  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });

  tracerProvider.register();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize MCP manager and add weather server
    const { initMCPManager, mcpManager } = await import(
      "./lib/mcp/mcp-manager"
    );
    await initMCPManager();

    // Add the built-in weather MCP server
    try {
      await mcpManager.addServer({
        id: "weather-server",
        name: "Weather Tools",
        type: "stdio",
        command: "node",
        args: ["./mcp-server.js"],
      });
      console.log("Weather MCP server registered");
    } catch (error) {
      console.error("Failed to register weather MCP server:", error);
    }
  }
}
