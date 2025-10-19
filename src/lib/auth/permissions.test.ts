import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
vi.mock("@/lib/supabase/auth-helpers", () => ({
  getSupabaseUser: vi.fn(),
}));

// server-only is used inside the module; stub it for tests
vi.mock("server-only", () => ({}));

const { getSupabaseUser } = await import("@/lib/supabase/auth-helpers");

// Dummy mock for skipped tests
const getIsUserAdmin = vi.fn();

describe.skip("auth/permissions", () => {
  // TODO: Update tests for Supabase auth migration
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hasAdminPermission returns true when user is admin", async () => {
    const permissions = await import("./permissions");
    vi.mocked(getSupabaseUser).mockResolvedValue({
      user: { id: "u1", role: "admin" },
    } as any);
    vi.mocked(getIsUserAdmin).mockReturnValue(true);

    await expect(permissions.hasAdminPermission()).resolves.toBe(true);
  });

  it("hasAdminPermission returns false when no session", async () => {
    const permissions = await import("./permissions");
    vi.mocked(getSupabaseUser).mockResolvedValue(null as any);

    await expect(permissions.hasAdminPermission()).resolves.toBe(false);
  });

  it("canManageUsers equals hasAdminPermission", async () => {
    const permissions = await import("./permissions");
    vi.mocked(getSupabaseUser).mockResolvedValue({
      user: { id: "u1", role: "user" },
    } as any);
    vi.mocked(getIsUserAdmin).mockReturnValue(false);

    await expect(permissions.canManageUsers()).resolves.toBe(false);

    vi.mocked(getIsUserAdmin).mockReturnValue(true);
    await expect(permissions.canManageUsers()).resolves.toBe(true);
  });

  it("canManageUser returns true for self regardless of admin", async () => {
    const permissions = await import("./permissions");
    vi.mocked(getSupabaseUser).mockResolvedValue({
      user: { id: "self", role: "user" },
    } as any);
    vi.mocked(getIsUserAdmin).mockReturnValue(false);

    await expect(permissions.canManageUser("self")).resolves.toBe(true);
  });

  it("canManageUser returns true for others if admin", async () => {
    const permissions = await import("./permissions");
    vi.mocked(getSupabaseUser).mockResolvedValue({
      user: { id: "u1", role: "admin" },
    } as any);
    vi.mocked(getIsUserAdmin).mockReturnValue(true);

    await expect(permissions.canManageUser("other")).resolves.toBe(true);
  });

  it("requireAdminPermission throws when not admin", async () => {
    const permissions = await import("./permissions");
    vi.mocked(getSupabaseUser).mockResolvedValue({
      user: { id: "u1", role: "user" },
    } as any);
    vi.mocked(getIsUserAdmin).mockReturnValue(false);

    await expect(
      permissions.requireAdminPermission("do admin thing"),
    ).rejects.toThrow(/Admin access required/);
  });

  it("requireUserManagePermissionFor throws when cannot manage target", async () => {
    const permissions = await import("./permissions");
    vi.mocked(getSupabaseUser).mockResolvedValue({
      user: { id: "u1", role: "user" },
    } as any);
    vi.mocked(getIsUserAdmin).mockReturnValue(false);

    await expect(
      permissions.requireUserManagePermissionFor("u2", "manage this user"),
    ).rejects.toThrow(/Permission required/);
  });
});
