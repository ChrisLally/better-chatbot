#!/usr/bin/env node

/**
 * MCP Server for Weather Tools
 * Wraps the weather tools as an MCP server using stdio transport
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Weather tool implementations
const weatherOptions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
const coordinatesDb = {
  "new york": { lat: 40.7128, lon: -74.006 },
  "los angeles": { lat: 34.0522, lon: -118.2437 },
  chicago: { lat: 41.8781, lon: -87.6298 },
  "san francisco": { lat: 37.7749, lon: -122.4194 },
  london: { lat: 51.5074, lon: -0.1278 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
  paris: { lat: 48.8566, lon: 2.3522 },
};

// Tool implementations
async function getWeather(city) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const weather =
    weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
  const temperature = Math.floor(Math.random() * 40) + 40;
  return { city, temperature, weather };
}

async function getGeolocation(location) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const normalized = location.toLowerCase();
  const coords = coordinatesDb[normalized] || { lat: 40.0, lon: -74.0 };
  return {
    location,
    latitude: coords.lat,
    longitude: coords.lon,
  };
}

async function getAlerts(city) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const alerts = [
    { type: "none", message: "No active alerts" },
    { type: "wind", message: "High wind advisory in effect" },
    { type: "snow", message: "Winter storm warning" },
    { type: "flood", message: "Flood watch" },
  ];
  const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
  return {
    city,
    alert: randomAlert.type,
    message: randomAlert.message,
  };
}

async function getForecast(city) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const forecast = Array.from({ length: 5 }, (_, i) => ({
    day: i + 1,
    weather: weatherOptions[Math.floor(Math.random() * weatherOptions.length)],
    high: Math.floor(Math.random() * 30) + 55,
    low: Math.floor(Math.random() * 20) + 40,
  }));
  return { city, forecast };
}

// Create MCP Server with tools capability
const server = new Server(
  {
    name: "weather-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Handle initialization
server.setRequestHandler(InitializeRequestSchema, async (_request) => {
  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "weather-mcp-server",
      version: "1.0.0",
    },
  };
});

// Define the tools
const TOOLS = [
  {
    name: "get_weather",
    description: "Get the current weather for a location",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city name",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "get_geolocation",
    description: "Get geographical coordinates for a location",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location name",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "get_alerts",
    description: "Get weather alerts for a location",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city name",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "get_forecast",
    description: "Get a 5-day weather forecast for a location",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city name",
        },
      },
      required: ["city"],
    },
  },
];

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case "get_weather":
        result = await getWeather(args.city);
        break;
      case "get_geolocation":
        result = await getGeolocation(args.location);
        break;
      case "get_alerts":
        result = await getAlerts(args.city);
        break;
      case "get_forecast":
        result = await getForecast(args.city);
        break;
      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
