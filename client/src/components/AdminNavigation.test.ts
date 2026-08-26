import { describe, expect, it } from "vitest";
import { adminMenu, filterAdminNavigation } from "./AdminNavigation";

describe("admin quick search", () => {
  it("finds settings by Arabic label", () => {
    const results = filterAdminNavigation(adminMenu, "المسارات");
    expect(results.map((item) => item.path)).toContain("/admin/settings/route-prices");
  });

  it("returns all admin sections for an empty query", () => {
    expect(filterAdminNavigation(adminMenu, "")).toHaveLength(adminMenu.length);
  });

  it("returns no results for an unknown term", () => {
    expect(filterAdminNavigation(adminMenu, "غير موجود")).toHaveLength(0);
  });
});
