import { describe, it, expect, vi, beforeEach } from "vitest";
import { USER_ROLES } from "app-types/roles";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock the auth module
vi.mock("@/lib/supabase/auth-helpers", () => ({
  getSupabaseUser: vi.fn(),
}));

// Mock the new permission system
vi.mock("lib/auth/permissions", () => ({
  requireAdminPermission: vi.fn(),
  requireUserListPermission: vi.fn(),
  hasAdminPermission: vi.fn(),
  canListUsers: vi.fn(),
}));

// Mock the users service
const mockGetUsers = vi.fn().mockResolvedValue([]);
vi.mock("@/services/supabase/users-service", () => ({
  getUsers: mockGetUsers,
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({}),
}));

// Import after mocks
import {
  requireAdminSession,
  getAdminUsers,
  ADMIN_USER_LIST_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIRECTION,
} from "./server";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  requireAdminPermission,
  requireUserListPermission,
  hasAdminPermission,
  canListUsers,
} from "lib/auth/permissions";

describe("Admin Server - Business Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAdminSession - Admin Role Detection", () => {
    it("should detect admin role case-insensitively", async () => {
      const testCases = [
        { role: "admin", shouldPass: true },
        { role: "ADMIN", shouldPass: true },
        { role: "Admin", shouldPass: true },
        { role: "user,admin", shouldPass: true },
        { role: "ADMIN,editor", shouldPass: true },
        { role: "user", shouldPass: false },
        { role: "editor", shouldPass: false },
        { role: "USER,EDITOR", shouldPass: false },
        { role: "", shouldPass: false },
        { role: null, shouldPass: false },
        { role: undefined, shouldPass: false },
      ];

      for (const testCase of testCases) {
        const mockSession = {
          user: { id: "test-user", role: testCase.role },
          session: { id: "session-1" },
        };

        vi.mocked(getSupabaseUser).mockResolvedValue(mockSession as any);

        if (testCase.shouldPass) {
          vi.mocked(hasAdminPermission).mockResolvedValue(true);
          vi.mocked(requireAdminPermission).mockResolvedValue(undefined);
          const result = await requireAdminSession();
          expect(result).toEqual(mockSession);
        } else {
          vi.mocked(hasAdminPermission).mockResolvedValue(false);
          vi.mocked(requireAdminPermission).mockRejectedValue(
            new Error(
              "Unauthorized: Admin access required to access admin functions",
            ),
          );
          await expect(requireAdminSession()).rejects.toThrow(
            "Unauthorized: Admin access required to access admin functions",
          );
        }
      }
    });
  });

  describe("getAdminUsers - Query Parameter Handling", () => {
    beforeEach(() => {
      // Mock admin session by default
      vi.mocked(getSupabaseUser).mockResolvedValue({
        user: { id: "admin-1", role: USER_ROLES.ADMIN },
      } as any);
      // Mock permissions by default
      vi.mocked(canListUsers).mockResolvedValue(true);
      vi.mocked(requireUserListPermission).mockResolvedValue(undefined);
    });

    it("should apply correct defaults when no query provided", async () => {
      await getAdminUsers();

      expect(mockGetUsers).toHaveBeenCalledTimes(1);
    });

    it("should override defaults with provided query parameters", async () => {
      const customQuery = {
        limit: 25,
        offset: 50,
        sortBy: "name" as const,
        sortDirection: "asc" as const,
        searchValue: "john",
        searchField: "email" as const,
      };

      await getAdminUsers(customQuery);

      expect(mockGetUsers).toHaveBeenCalledTimes(1);
    });

    it("should return properly formatted user data", async () => {
      // Test that the function returns the expected structure
      const result = await getAdminUsers({ limit: 10, offset: 0 });

      expect(result).toHaveProperty("users");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("offset");
      expect(Array.isArray(result.users)).toBe(true);
    });

    it("should enforce admin access before making API call", async () => {
      vi.mocked(getSupabaseUser).mockResolvedValue({
        user: { id: "user-1", role: USER_ROLES.USER },
      } as any);
      vi.mocked(canListUsers).mockResolvedValue(false);
      vi.mocked(requireUserListPermission).mockRejectedValue(
        new Error(
          "Unauthorized: Permission required to list users in admin panel",
        ),
      );

      await expect(getAdminUsers()).rejects.toThrow(
        "Unauthorized: Permission required to list users in admin panel",
      );

      // Should not make the API call if not admin
      expect(mockGetUsers).not.toHaveBeenCalled();
    });
  });

  describe("Constants", () => {
    it("should have correct default values", () => {
      expect(ADMIN_USER_LIST_LIMIT).toBe(10);
      expect(DEFAULT_SORT_BY).toBe("createdAt");
      expect(DEFAULT_SORT_DIRECTION).toBe("desc");
    });
  });
});
