import { CheckCircle2, Navigation, Route, XCircle } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function DriverStopsPanel() {
  const [location] = useLocation(); const active = location === "/driver"; const utils = trpc.useUtils();
  const orders = trpc.driver.myOrders.useQuery(undefined, { enabled: active, refetchInterval: 10000 });
  const order = useMemo(() => orders.data?.find((item) => ["picked_up", "in_delivery"].includes(item.status)), [orders.data]);
  const stops = trpc.driver.stops.useQuery({ orderId: order?.id || 0 }, { enabled: Boolean(order?.id), refetchInterval: 8000 });
  const update = trpc.driver.updateStop.useMutation({ onSuccess: () => { utils.driver.stops.invalidate({ orderId: order?.id || 0 }); toast.success("تم تحديث نقطة التوقف وإبلاغ العميل."); }, onError: (error) => toast.error(error.message) });
  if (!active || !order || !stops.data?.length) return null;
  return <section dir="rtl" className="fixed bottom-5 left-3 z-50 w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_16px_38px_rgba(8,37,56,.2)] sm:left-5"><div className="flex items-center gap-2"><span className="rounded-lg bg-teal-100 p-2 text-teal-700"><Route className="h-4 w-4" /></span><div><p className="text-sm font-black text-[#082538]">محطات الطلب {order.reference}</p><p className="mt-0.5 text-xs font-medium text-slate-500">نفّذ المحطات قبل الوجهة النهائية.</p></div></div><div className="mt-3 space-y-2">{stops.data.map((stop) => <article key={stop.id} className="rounded-xl bg-slate-50 p-3"><div className="flex gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-600">{stop.sequence}</span><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-800">{stop.address}</p>{stop.recipientPhone && <a href={`tel:${stop.recipientPhone}`} className="mt-1 block text-[11px] font-bold text-teal-700">{stop.recipientPhone}</a>}</div>{stop.status === "delivered" ? <CheckCircle2 className="h-5 w-5 text-teal-600" /> : stop.status === "skipped" ? <XCircle className="h-5 w-5 text-slate-400" /> : <Navigation className="h-5 w-5 text-teal-700" />}</div>{stop.status === "pending" && <div className="mt-3 flex gap-2"><button disabled={update.isPending} onClick={() => update.mutate({ stopId: stop.id, status: "delivered" })} className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-extrabold text-white">تم التسليم</button><button disabled={update.isPending} onClick={() => update.mutate({ stopId: stop.id, status: "skipped" })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600">تجاوز</button></div>}</article>)}</div></section>;
}
