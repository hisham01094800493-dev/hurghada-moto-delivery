import { describe, expect, it } from "vitest";
import { getNextTheme, resolveInitialTheme } from "./ThemeContext";

describe("theme preference", () => {
  it("switches light mode to dark mode", () => {
    expect(getNextTheme("light")).toBe("dark");
  });

  it("switches dark mode back to light mode", () => {
    expect(getNextTheme("dark")).toBe("light");
  });

  it("uses the system preference on the first visit", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  it("prioritizes a saved manual preference over the system", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
    expect(resolveInitialTheme("dark", false)).toBe("dark");
  });
});
