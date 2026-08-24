import { describe, expect, it } from "vitest";
import { customerNavigation, isNavigationItemActive } from "./customer-navigation";

describe("customer navigation", () => {
  it("provides the customer shortcuts required for the side menu", () => {
    expect(customerNavigation.map((item) => item.path)).toEqual(["/", "/book/parcel", "/my-orders", "/settings", "/support"]);
  });

  it("marks exact and nested routes as active without marking the home route globally active", () => {
    expect(isNavigationItemActive("/my-orders", "/my-orders")).toBe(true);
    expect(isNavigationItemActive("/support/thread", "/support")).toBe(true);
    expect(isNavigationItemActive("/my-orders", "/")).toBe(false);
  });
});
