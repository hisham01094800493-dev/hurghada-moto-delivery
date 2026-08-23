import { describe, expect, it } from "vitest";
import { calculateDistanceMeters } from "./db";

describe("driver dispatch distance", () => {
  it("returns zero for the same pickup and driver location", () => {
    expect(calculateDistanceMeters(27.2579, 33.8116, 27.2579, 33.8116)).toBe(0);
  });

  it("calculates a nearby Hurghada distance in meters", () => {
    const distance = calculateDistanceMeters(27.2579, 33.8116, 27.2600, 33.8140);
    expect(distance).toBeGreaterThan(250);
    expect(distance).toBeLessThan(400);
  });
});
