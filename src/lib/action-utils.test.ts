import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock the auth modules
vi.mock("@/lib/supabase/auth-helpers", () => ({
  getSupabaseUser: vi.fn(),
}));

// Import after mocks
import { validatedAction, validatedActionWithUser } from "./action-utils";

const { getSupabaseUser } = await import("@/lib/supabase/auth-helpers");

describe("action-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validatedAction", () => {
    it("should validate form data and call action with valid data", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.string().transform(Number),
      });

      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedAction(schema, mockAction);

      const formData = new FormData();
      formData.set("name", "John");
      formData.set("age", "25");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { name: "John", age: 25 },
        formData,
      );
      expect(result).toEqual({ success: true });
    });

    it("should return error when validation fails", async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const mockAction = vi.fn();
      const wrappedAction = validatedAction(schema, mockAction);

      const formData = new FormData();
      formData.set("email", "invalid-email");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toHaveProperty("error");
      expect((result as any).error).toContain("Invalid email");
    });
  });

  describe("validatedActionWithUser", () => {
    it("should call action with user when authenticated", async () => {
      const mockSupabaseUser = {
        id: "user-1",
        email: "john@example.com",
        user_metadata: {
          name: "John Doe",
        },
        role: "user",
      };

      vi.mocked(getSupabaseUser).mockResolvedValue(mockSupabaseUser as any);

      const schema = z.object({ data: z.string() });
      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedActionWithUser(schema, mockAction);

      const formData = new FormData();
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { data: "test" },
        formData,
        expect.objectContaining({
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
          role: "user",
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it("should return error when user is not authenticated", async () => {
      vi.mocked(getSupabaseUser).mockResolvedValue(null);

      const schema = z.object({ data: z.string() });
      const mockAction = vi.fn();
      const wrappedAction = validatedActionWithUser(schema, mockAction);

      const formData = new FormData();
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: "User is not authenticated",
      });
    });
  });
});
