export const deliveryServiceTypes = ["person", "parcel", "documents", "items", "other"] as const;
export type DeliveryServiceType = (typeof deliveryServiceTypes)[number];

export type ServicePricingRule = { baseFare: number; perKmFare: number; minimumFare: number };
export type ServicePricingRules = Record<DeliveryServiceType, ServicePricingRule>;

type Coordinate = { latitude?: number | null; longitude?: number | null };

export const MINIMUM_PER_KM_FARE = 5;

export const defaultServicePricingRules: ServicePricingRules = {
  person: { baseFare: 30, perKmFare: 5, minimumFare: 35 },
  parcel: { baseFare: 40, perKmFare: 7, minimumFare: 45 },
  documents: { baseFare: 35, perKmFare: 6, minimumFare: 40 },
  items: { baseFare: 45, perKmFare: 8, minimumFare: 50 },
  other: { baseFare: 45, perKmFare: 8, minimumFare: 50 },
};

export function normalizeServicePricingRules(overrides?: Partial<ServicePricingRules>): ServicePricingRules {
  return deliveryServiceTypes.reduce((rules, serviceType) => {
    const candidate = overrides?.[serviceType] || defaultServicePricingRules[serviceType];
    rules[serviceType] = { baseFare: Math.max(0, Math.round(candidate.baseFare)), perKmFare: Math.max(MINIMUM_PER_KM_FARE, Math.round(candidate.perKmFare)), minimumFare: Math.max(0, Math.round(candidate.minimumFare)) };
    return rules;
  }, {} as ServicePricingRules);
}

export function calculateDistanceMeters(pickup: Coordinate, destination: Coordinate) {
  if ([pickup.latitude, pickup.longitude, destination.latitude, destination.longitude].some((value) => typeof value !== "number")) return 0;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians((destination.latitude as number) - (pickup.latitude as number));
  const longitudeDelta = toRadians((destination.longitude as number) - (pickup.longitude as number));
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(pickup.latitude as number)) * Math.cos(toRadians(destination.latitude as number)) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function calculateOperationalQuote({ serviceType, distanceMeters, requestedFor, pricingRules }: { serviceType: DeliveryServiceType; distanceMeters: number; requestedFor: string | Date; pricingRules?: Partial<ServicePricingRules> }) {
  const distanceKm = Math.max(0, distanceMeters) / 1000;
  const config = normalizeServicePricingRules(pricingRules)[serviceType];
  const hour = new Date(requestedFor).getHours();
  const lateHoursSurcharge = hour >= 22 || hour < 7 ? 15 : 0;
  const estimatedFee = Math.max(config.minimumFare, Math.round(config.baseFare + Math.ceil(distanceKm) * config.perKmFare + lateHoursSurcharge));
  const estimatedMinutes = Math.max(8, Math.round(8 + distanceKm * 3));
  return { distanceMeters: Math.round(distanceMeters), estimatedMinutes, estimatedFee };
}

export function calculatePlatformCommission(grossFee: number, commissionPercent: number) {
  const normalizedGross = Math.max(0, Math.round(grossFee));
  const normalizedPercent = Math.min(80, Math.max(0, Math.round(commissionPercent)));
  const platformCommissionAmount = Math.round((normalizedGross * normalizedPercent) / 100);
  return { grossFee: normalizedGross, commissionPercent: normalizedPercent, platformCommissionAmount, driverEarnings: normalizedGross - platformCommissionAmount };
}
