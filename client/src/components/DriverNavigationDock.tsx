import { Navigation } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export function DriverNavigationDock() {
  const [location] = useLocation(); const orders = trpc.driver.myOrders.useQuery(undefined, { enabled: location === "/driver", refetchInterval: 10000 }); const active = useMemo(() => orders.data?.find((order) => !["delivered", "cancelled"].includes(order.status)), [orders.data]);
  if (location !== "/driver" || !active) return null; const toPickup = ["assigned", "driver_arrived"].includes(active.status); const destination = toPickup ? active.pickupAddress : active.destinationAddress;
  return <a dir="rtl" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noreferrer" className="fixed bottom-5 right-3 z-50 inline-flex items-center gap-2 rounded-2xl bg-[#082538] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(8,37,56,.22)] transition hover:bg-teal-700 sm:right-5"><Navigation className="h-4 w-4" />{toPickup ? "الملاحة إلى الاستلام" : "الملاحة إلى التسليم"}</a>;
}
