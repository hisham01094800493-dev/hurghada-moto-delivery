import { CheckCircle2, MapPinned, Route, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export function OrderStopsPanel() {
  const [location] = useLocation(); const match = location.match(/^\/track\/([^/]+)$/); const [open, setOpen] = useState(false);
  const tracking = trpc.orders.track.useQuery({ reference: match?.[1] || "" }, { enabled: Boolean(match?.[1]), refetchInterval: 10000 });
  const stops = tracking.data?.stops || [];
  if (!match || !stops.length) return null;
  return <div dir="rtl" className="fixed bottom-5 left-3 z-50 w-[calc(100%-1.5rem)] max-w-sm sm:left-5">{open ? <section className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_16px_38px_rgba(8,37,56,.2)]"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#082538]">محطات التسليم الإضافية</p><p className="mt-1 text-xs font-medium text-slate-500">تُنفذ قبل الوجهة النهائية للطلب.</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="إغلاق"><X className="h-4 w-4" /></button></div><ol className="mt-4 space-y-3">{stops.map((stop) => <li key={stop.id} className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${stop.status === "delivered" ? "bg-teal-100 text-teal-700" : "bg-white text-slate-500"}`}>{stop.status === "delivered" ? <CheckCircle2 className="h-4 w-4" /> : stop.sequence}</span><div><p className="text-xs font-black text-slate-800">{stop.address}</p>{stop.recipientName && <p className="mt-1 text-[11px] font-bold text-slate-500">المستلم: {stop.recipientName}</p>}{stop.notes && <p className="mt-1 text-[11px] font-medium text-slate-500">{stop.notes}</p>}</div></li>)}</ol></section> : <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-[#082538] shadow-[0_10px_26px_rgba(8,37,56,.16)] ring-1 ring-teal-100 transition hover:bg-teal-50 active:scale-[.97]"><span className="rounded-lg bg-teal-100 p-1.5 text-teal-700"><Route className="h-4 w-4" /></span>{stops.length} محطة إضافية</button>}</div>;
}
