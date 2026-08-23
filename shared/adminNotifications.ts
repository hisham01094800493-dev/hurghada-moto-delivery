export function hasNewPendingPayment(previousCount: number | null, currentCount: number) {
  return previousCount !== null && currentCount > previousCount;
}
