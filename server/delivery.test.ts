import { describe, expect, it } from "vitest";
import { deliveryOrderInput, estimateDeliveryFee } from "./delivery";

const baseOrder = {
  serviceType: "person" as const,
  customerName: "أحمد علي",
  customerPhone: "01012345678",
  pickupAddress: "ميدان السقالة، الغردقة",
  destinationAddress: "الممشى السياحي، الغردقة",
  requestedFor: "2026-08-23T14:00",
  contactless: true,
};

describe("delivery pricing", () => {
  it("uses the base fee for a daytime parcel delivery", () => {
    expect(estimateDeliveryFee("parcel", "2026-08-23T14:00")).toBe(45);
  });

  it("adds the late-hours surcharge to a person delivery", () => {
    expect(estimateDeliveryFee("person", "2026-08-23T23:00")).toBe(80);
  });
});

describe("delivery order validation", () => {
  it("requires parcel recipient information and a description", () => {
    const result = deliveryOrderInput.safeParse({ ...baseOrder, serviceType: "parcel" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid person delivery request", () => {
    expect(deliveryOrderInput.safeParse(baseOrder).success).toBe(true);
  });
});
