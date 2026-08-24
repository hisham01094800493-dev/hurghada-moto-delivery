import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { customerNavigation, isNavigationItemActive } from "@shared/customer-navigation";
import { CircleHelp, ClipboardList, Home, LogIn, Menu, PackagePlus, Settings2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const icons = { home: Home, "new-order": PackagePlus, orders: ClipboardList, account: Settings2, support: CircleHelp };

export function CustomerSideMenu() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const unread = trpc.support.unreadCounts.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5000 });
  const unreadTotal = (unread.data?.support || 0) + (unread.data?.driver || 0);

  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><button type="button" aria-label="فتح القائمة" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-700 active:scale-[.97]"><Menu className="h-5 w-5" /></button></SheetTrigger><SheetContent side="right" dir="rtl" className="w-[86vw] max-w-sm border-l border-slate-200 bg-[#f8fbfc] p-0"><SheetHeader className="border-b border-slate-200 bg-white px-6 py-6 text-right"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#082538] text-white"><UserRound className="h-5 w-5" /></span><div><SheetTitle className="text-base font-black text-[#082538]">{isAuthenticated ? user?.name || "حسابي" : "اطلب أونلاين"}</SheetTitle><SheetDescription className="mt-1 text-xs font-bold text-slate-500">{isAuthenticated ? "اختصارات الحساب والطلبات" : "اختر الخدمة التي تحتاج إليها"}</SheetDescription></div></div></SheetHeader><nav className="flex-1 space-y-2 px-4 py-5" aria-label="تنقل العميل">{customerNavigation.map((item) => { const Icon = icons[item.key]; const active = isNavigationItemActive(location, item.path); const requiresAuth = item.key === "orders" || item.key === "account"; return <SheetClose asChild key={item.key}><Link href={item.path} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-extrabold no-underline transition ${active ? "bg-[#082538] text-white shadow-[0_10px_22px_rgba(8,37,56,.17)]" : "text-slate-700 hover:bg-white hover:text-teal-700"}`}><Icon className="h-5 w-5" /><span className="flex-1">{item.label}</span>{item.key === "support" && unreadTotal > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}>{unreadTotal}</span>}{requiresAuth && !isAuthenticated && <span className="text-[10px] font-bold opacity-70">يتطلب الدخول</span>}</Link></SheetClose>; })}</nav><SheetFooter className="border-t border-slate-200 bg-white p-4">{isAuthenticated ? <p className="rounded-xl bg-teal-50 px-4 py-3 text-xs font-bold leading-6 text-teal-900">يمكنك متابعة الطلبات وتعديل إعدادات الحساب من هذه القائمة.</p> : <button onClick={() => { setOpen(false); startLogin(); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#082538] px-4 py-3 text-sm font-extrabold text-white"><LogIn className="h-4 w-4" /> دخول سريع / إنشاء حساب</button>}</SheetFooter></SheetContent></Sheet>;
}
