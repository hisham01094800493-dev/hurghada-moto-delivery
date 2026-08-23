import { describe, expect, it } from "vitest";
import { estimateDriverArrivalMinutes } from "./eta";

describe("driver ETA", () => {
  const order = { estimatedMinutes: 30, pickupLatitude: 27.2579, pickupLongitude: 33.8116 };

  it("uses the nearby driver location when available", () => {
    expect(estimateDriverArrivalMinutes(order, { lastLatitude: 27.2600, lastLongitude: 33.8140 })).toBeGreaterThanOrEqual(1);
  });

  it("falls back to half the estimated trip time without a driver location", () => {
    expect(estimateDriverArrivalMinutes(order, { lastLatitude: null, lastLongitude: null })).toBe(15);
    expect(estimateDriverArrivalMinutes(order, undefined)).toBe(15);
  });
});
