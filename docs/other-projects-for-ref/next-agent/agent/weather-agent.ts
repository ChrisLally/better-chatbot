import {
  weatherTool,
  geolocationTool,
  alertsTool,
  forecastTool,
} from "@/tool/weather-tool";
import { google } from "@ai-sdk/google";
import { ToolLoopAgent, InferAgentUIMessage } from "ai";

export const weatherAgent = new ToolLoopAgent({
  model: google("gemini-2.5-flash"),
  instructions:
    "You are a helpful weather assistant. When users ask about weather, use the available tools to get current conditions, forecasts, alerts, and location data. For comprehensive weather inquiries, use multiple tools to provide complete information.",
  tools: {
    weather: weatherTool,
    geolocation: geolocationTool,
    alerts: alertsTool,
    forecast: forecastTool,
  },
});

export type WeatherAgentUIMessage = InferAgentUIMessage<typeof weatherAgent>;
