import { describe, expect, it } from "vitest";
import { customerNavigation, getRoleNavigation, isNavigationItemActive } from "./customer-navigation";

describe("customer navigation", () => {
  it("provides the customer shortcuts required for the side menu", () => {
    expect(customerNavigation.map((item) => item.path)).toEqual(["/", "/book/parcel", "/my-orders", "/settings", "/support"]);
  });

  it("marks exact and nested routes as active without marking the home route globally active", () => {
    expect(isNavigationItemActive("/my-orders", "/my-orders")).toBe(true);
    expect(isNavigationItemActive("/support/thread", "/support")).toBe(true);
    expect(isNavigationItemActive("/my-orders", "/")).toBe(false);
  });

  it("only returns driver and administrative shortcuts for the matching role", () => {
    expect(getRoleNavigation("user", false).driver).toEqual([]);
    expect(getRoleNavigation("driver", false).driver).toEqual([]);
    expect(getRoleNavigation("driver", true).driver.map((item) => item.path)).toEqual(["/driver", "/driver/earnings"]);
    expect(getRoleNavigation("admin", false).admin.map((item) => item.path)).toEqual(["/admin", "/admin/drivers", "/admin/coupons", "/admin/feedback", "/admin/audit"]);
  });
});
