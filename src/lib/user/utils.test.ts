import { describe, it, expect, beforeEach } from "vitest";
import { getUserAvatar, getIsUserAdmin } from "./utils";

describe("User Utils", () => {
  beforeEach(() => {
    delete process.env.DISABLE_DEFAULT_AVATAR;
  });

  describe("getUserAvatar - Avatar Selection Logic", () => {
    it("should prioritize user image over default", () => {
      const result = getUserAvatar({ image: "https://example.com/avatar.jpg" });
      expect(result).toBe("https://example.com/avatar.jpg");
    });

    it("should fall back to default avatar when no user image", () => {
      expect(getUserAvatar({ image: null })).toBe("/pf.png");
      expect(getUserAvatar({})).toBe("/pf.png");
      expect(getUserAvatar({ image: "" })).toBe("/pf.png");
    });

    it("should respect DISABLE_DEFAULT_AVATAR environment flag", () => {
      process.env.DISABLE_DEFAULT_AVATAR = "true";

      expect(getUserAvatar({ image: null })).toBe("");
      expect(getUserAvatar({})).toBe("");

      // But still return user image when available
      expect(getUserAvatar({ image: "custom.jpg" })).toBe("custom.jpg");
    });
  });

  describe("getIsUserAdmin - Role Functionality", () => {
    it("should always return false since role functionality was removed", () => {
      expect(getIsUserAdmin({ role: "admin" })).toBe(false);
      expect(getIsUserAdmin({ role: "user" })).toBe(false);
      expect(getIsUserAdmin({ role: "editor" })).toBe(false);
      expect(getIsUserAdmin({ role: "ADMIN" })).toBe(false);
      expect(getIsUserAdmin({ role: null })).toBe(false);
      expect(getIsUserAdmin({})).toBe(false);
      expect(getIsUserAdmin({ role: "" })).toBe(false);
      expect(getIsUserAdmin(undefined)).toBe(false);
    });
  });
});
