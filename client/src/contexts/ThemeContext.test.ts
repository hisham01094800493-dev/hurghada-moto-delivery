import { describe, expect, it } from "vitest";
import { getNextTheme } from "./ThemeContext";

describe("theme preference", () => {
  it("switches light mode to dark mode", () => {
    expect(getNextTheme("light")).toBe("dark");
  });

  it("switches dark mode back to light mode", () => {
    expect(getNextTheme("dark")).toBe("light");
  });
});
