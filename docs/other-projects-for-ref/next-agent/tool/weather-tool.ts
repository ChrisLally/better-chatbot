import { UIToolInvocation, tool } from "ai";
import { z } from "zod";

export const weatherTool = tool({
  description: "Get the weather in a location",
  inputSchema: z.object({ city: z.string() }),
  async *execute({ city = "new york" }: { city: string }) {
    // fix this unused-vars rule
    yield { state: "loading" as const, city };

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const weatherOptions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
    const weather =
      weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    const temperature = Math.floor(Math.random() * 40) + 40;

    yield {
      state: "ready" as const,
      temperature,
      weather,
    };
  },
});

export const geolocationTool = tool({
  description: "Get geographical coordinates for a city or location name",
  inputSchema: z.object({ location: z.string() }),
  async *execute({ location }: { location: string }) {
    yield { state: "loading" as const };

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate geocoding results
    const coordinates: Record<string, { lat: number; lon: number }> = {
      "new york": { lat: 40.7128, lon: -74.006 },
      "los angeles": { lat: 34.0522, lon: -118.2437 },
      chicago: { lat: 41.8781, lon: -87.6298 },
      "san francisco": { lat: 37.7749, lon: -122.4194 },
      london: { lat: 51.5074, lon: -0.1278 },
      tokyo: { lat: 35.6762, lon: 139.6503 },
      paris: { lat: 48.8566, lon: 2.3522 },
    };

    const normalized = location.toLowerCase();
    const coords = coordinates[normalized] || { lat: 40.0, lon: -74.0 };

    yield {
      state: "ready" as const,
      location,
      latitude: coords.lat,
      longitude: coords.lon,
    };
  },
});

export const alertsTool = tool({
  description: "Get weather alerts for a specific location",
  inputSchema: z.object({ city: z.string() }),
  async *execute({ city }: { city: string }) {
    yield { state: "loading" as const };

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const alerts = [
      { type: "none", message: "No active alerts" },
      { type: "wind", message: "High wind advisory in effect" },
      { type: "snow", message: "Winter storm warning" },
      { type: "flood", message: "Flood watch" },
    ];

    const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];

    yield {
      state: "ready" as const,
      city,
      alert: randomAlert.type,
      message: randomAlert.message,
    };
  },
});

export const forecastTool = tool({
  description: "Get a 5-day weather forecast for a location",
  inputSchema: z.object({ city: z.string() }),
  async *execute({ city }: { city: string }) {
    yield { state: "loading" as const };

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const weatherOptions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
    const forecast = Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      weather:
        weatherOptions[Math.floor(Math.random() * weatherOptions.length)],
      high: Math.floor(Math.random() * 30) + 55,
      low: Math.floor(Math.random() * 20) + 40,
    }));

    yield {
      state: "ready" as const,
      city,
      forecast,
    };
  },
});

export type WeatherUIToolInvocation = UIToolInvocation<typeof weatherTool>;
export type GeolocationUIToolInvocation = UIToolInvocation<
  typeof geolocationTool
>;
export type AlertsUIToolInvocation = UIToolInvocation<typeof alertsTool>;
export type ForecastUIToolInvocation = UIToolInvocation<typeof forecastTool>;
