export const deliveryServiceTypes = ["person", "parcel", "documents", "items", "other"] as const;
export type DeliveryServiceType = (typeof deliveryServiceTypes)[number];

type Coordinate = { latitude?: number | null; longitude?: number | null };

const pricing = {
  person: { base: 65, perKm: 7 },
  parcel: { base: 45, perKm: 6 },
  documents: { base: 35, perKm: 5 },
  items: { base: 50, perKm: 7 },
  other: { base: 55, perKm: 7 },
} as const;

export function calculateDistanceMeters(pickup: Coordinate, destination: Coordinate) {
  if ([pickup.latitude, pickup.longitude, destination.latitude, destination.longitude].some((value) => typeof value !== "number")) return 0;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians((destination.latitude as number) - (pickup.latitude as number));
  const longitudeDelta = toRadians((destination.longitude as number) - (pickup.longitude as number));
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(pickup.latitude as number)) * Math.cos(toRadians(destination.latitude as number)) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function calculateOperationalQuote({ serviceType, distanceMeters, requestedFor }: { serviceType: DeliveryServiceType; distanceMeters: number; requestedFor: string | Date }) {
  const distanceKm = Math.max(0, distanceMeters) / 1000;
  const config = pricing[serviceType];
  const hour = new Date(requestedFor).getHours();
  const lateHoursSurcharge = hour >= 22 || hour < 7 ? 15 : 0;
  const estimatedFee = Math.round(config.base + Math.ceil(distanceKm) * config.perKm + lateHoursSurcharge);
  const estimatedMinutes = Math.max(8, Math.round(8 + distanceKm * 3));
  return { distanceMeters: Math.round(distanceMeters), estimatedMinutes, estimatedFee };
}
