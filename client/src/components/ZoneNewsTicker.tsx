import { ArrowLeftRight, MapPinned, Tag } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function ZoneNewsTicker() {
  const routes = trpc.pricing.routePrices.useQuery(undefined, { refetchInterval: 60000 });
  const zones = trpc.pricing.zones.useQuery(undefined, { refetchInterval: 60000 });
  const messages = routes.data?.length ? routes.data.map((route) => `من ${route.fromZoneName} إلى ${route.toZoneName}: يبدأ السعر من ${route.fixedPrice} ج.م`) : (zones.data?.filter((zone) => zone.isActive).map((zone) => `توصيل منطقة ${zone.name}: رسوم إضافية ${zone.surcharge} ج.م`) || ["خدمة التوصيل متاحة داخل الغردقة", "التسعير يبدأ وفق المسافة ونوع الخدمة"]);
  const loop = [...messages, ...messages];
  return <div dir="rtl" className="border-t border-teal-100 bg-[#082538] text-white"><div className="container flex h-10 items-center gap-3 overflow-hidden"><span className="z-10 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-500 px-2.5 py-1 text-[11px] font-black shadow-sm"><MapPinned className="h-3.5 w-3.5" />مناطق وأسعار</span><div tabIndex={0} className="zone-news-pause min-w-0 overflow-hidden rounded outline-none focus-visible:ring-2 focus-visible:ring-teal-300"><div className="zone-news-track flex w-max items-center gap-8 whitespace-nowrap text-xs font-bold text-white/90 motion-reduce:translate-x-0">{loop.map((message, index) => <span key={`${message}-${index}`} className="inline-flex items-center gap-2">{routes.data?.length ? <ArrowLeftRight className="h-3.5 w-3.5 text-teal-300" /> : <Tag className="h-3.5 w-3.5 text-teal-300" />}{message}</span>)}</div></div></div></div>;
}
