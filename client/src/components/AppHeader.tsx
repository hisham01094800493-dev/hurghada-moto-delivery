import { useAuth } from "@/_core/hooks/useAuth";
import { BrowserNotificationToggle } from "@/components/BrowserNotifications";
import { CustomerSideMenu } from "@/components/CustomerSideMenu";
import { ZoneNewsTicker } from "@/components/ZoneNewsTicker";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Bell, LogIn, PackageCheck, Route } from "lucide-react";
import { Link } from "wouter";

export default function AppHeader() {
  const { isAuthenticated, loading, user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/75 bg-[#f8fbfc]/85 backdrop-blur-xl">
      <div className="container flex h-[76px] items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 text-slate-950 no-underline">
          <img className="h-11 w-11 rounded-2xl shadow-[0_8px_20px_rgba(8,37,56,.17)]" src="/manus-storage/hurghada-moto-app-icon_235868ff.png" alt="أيقونة مشوار الغردقة" />
          <span className="leading-none">
            <strong className="block text-lg font-extrabold tracking-tight">اطلب أونلاين</strong>
            <small className="mt-1 block text-[11px] font-bold tracking-[0.12em] text-teal-700">HURGHADA DELIVERY</small>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
          <a href="/#services" className="transition hover:text-teal-700">الخدمات</a>
          <a href="/#safety" className="transition hover:text-teal-700">السلامة</a>
          <Link href="/my-orders" className="transition hover:text-teal-700">طلباتي</Link>
          <Link href="/profile" className="transition hover:text-teal-700">حسابي</Link>
          <Link href="/support" className="transition hover:text-teal-700">الدعم</Link>
        </nav>
        <div className="flex items-center gap-2">
          {!loading && (isAuthenticated ? (
            <>
              <span className="sm:hidden"><BrowserNotificationToggle compact /></span>
              <span className="hidden sm:block"><BrowserNotificationToggle /></span>
              <Link href="/notifications" aria-label="مركز الإشعارات" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-teal-200 hover:text-teal-700"><Bell className="h-4 w-4" /></Link>
              <Link href="/profile" className="hidden items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white no-underline sm:flex">
                <PackageCheck className="h-4 w-4" />
                <span>{user?.name?.split(" ")[0] || "طلباتي"}</span>
              </Link>
            </>
          ) : (
            <Button onClick={() => startLogin()} className="rounded-xl bg-slate-950 px-4 font-bold hover:bg-slate-800">
              <LogIn className="ml-2 h-4 w-4" /> دخول سريع / إنشاء حساب
            </Button>
          ))}
          <CustomerSideMenu />
        </div>
      </div>
      <ZoneNewsTicker />
    </header>
  );
}
