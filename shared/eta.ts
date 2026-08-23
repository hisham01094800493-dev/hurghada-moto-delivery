export type EtaOrder = { estimatedMinutes: number; pickupLatitude: number | null; pickupLongitude: number | null };
export type EtaDriver = { lastLatitude: number | null; lastLongitude: number | null };

export function estimateDriverArrivalMinutes(order: EtaOrder, driver: EtaDriver | undefined) {
  if (!driver || driver.lastLatitude === null || driver.lastLongitude === null || order.pickupLatitude === null || order.pickupLongitude === null) return Math.max(5, Math.round(order.estimatedMinutes / 2));
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(order.pickupLatitude - driver.lastLatitude);
  const dLng = radians(order.pickupLongitude - driver.lastLongitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(driver.lastLatitude)) * Math.cos(radians(order.pickupLatitude)) * Math.sin(dLng / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, Math.ceil((distanceKm / 25) * 60));
}
