import { describe, expect, it } from "vitest";
import { calculateDistanceMeters, calculateOperationalQuote, calculatePlatformCommission, normalizeServicePricingRules } from "@shared/delivery";
import { allowedStatusTransitions, assertOperationalStatusTransition, buildOperationalQuote, deliveryOrderInput, validateDriverStatusUpdate } from "./delivery";

const baseOrder = { serviceType: "person" as const, customerName: "أحمد علي", customerPhone: "01012345678", pickupAddress: "ميدان السقالة، الغردقة", pickupLatitude: 27.2579, pickupLongitude: 33.8116, destinationAddress: "الممشى السياحي، الغردقة", destinationLatitude: 27.24, destinationLongitude: 33.84, requestedFor: "2026-08-23T14:00", contactless: true };

describe("operational pricing", () => {
  it("calculates a non-zero distance between two mapped locations", () => expect(calculateDistanceMeters({ latitude: 27.2579, longitude: 33.8116 }, { latitude: 27.24, longitude: 33.84 })).toBeGreaterThan(100));
  it("adds a distance amount to the service base fee", () => expect(calculateOperationalQuote({ serviceType: "parcel", distanceMeters: 2000, requestedFor: "2026-08-23T14:00" }).estimatedFee).toBe(54));
  it("does not allow a per-kilometer rule below 5 جنيهات", () => expect(normalizeServicePricingRules({ person: { baseFare: 0, perKmFare: 2, minimumFare: 0 } }).person.perKmFare).toBe(5));
  it("prices a parcel above a person trip for the same distance by default", () => { const person = calculateOperationalQuote({ serviceType: "person", distanceMeters: 2000, requestedFor: "2026-08-23T14:00" }); const parcel = calculateOperationalQuote({ serviceType: "parcel", distanceMeters: 2000, requestedFor: "2026-08-23T14:00" }); expect(parcel.estimatedFee).toBeGreaterThan(person.estimatedFee); });
  it("splits completed order value into platform commission and driver net", () => expect(calculatePlatformCommission(120, 10)).toEqual({ grossFee: 120, commissionPercent: 10, platformCommissionAmount: 12, driverEarnings: 108 }));
  it("creates an operational quote from a valid request", () => expect(buildOperationalQuote(baseOrder).estimatedMinutes).toBeGreaterThanOrEqual(8));
});

describe("delivery order validation and states", () => {
  it("requires a recipient and description for parcel delivery", () => expect(deliveryOrderInput.safeParse({ ...baseOrder, serviceType: "parcel" }).success).toBe(false));
  it("accepts a valid person delivery request", () => expect(deliveryOrderInput.safeParse(baseOrder).success).toBe(true));
  it("only permits the operational next status from a new order", () => expect(allowedStatusTransitions.new).toEqual(["assigned", "cancelled"]));
  it("rejects an invalid operational transition", () => expect(() => assertOperationalStatusTransition("assigned", "delivered")).toThrow("لا يمكن تنفيذ هذا الإجراء"));
  it("permits the assigned-to-arrival operational transition", () => expect(() => assertOperationalStatusTransition("assigned", "driver_arrived")).not.toThrow());
  it("rejects an invalid state change through the driver update guard", () => expect(() => validateDriverStatusUpdate({ assignedDriverId: 5, actingDriverId: 5, currentStatus: "assigned", nextStatus: "delivered" })).toThrow("لا يمكن تنفيذ هذا الإجراء"));
  it("rejects a driver who is not assigned to the order", () => expect(() => validateDriverStatusUpdate({ assignedDriverId: 5, actingDriverId: 8, currentStatus: "assigned", nextStatus: "driver_arrived" })).toThrow("لا يمكنك تحديث هذا الطلب"));
});
