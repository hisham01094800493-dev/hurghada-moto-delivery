import { Download, MoreVertical, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> };

const DISMISS_KEY = "pwa-install-dismissed-until";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosBrowser() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false); const [dismissed, setDismissed] = useState(true); const [iosHelpOpen, setIosHelpOpen] = useState(false);

  useEffect(() => {
    const storedUntil = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    const installed = isStandalone();
    setIos(isIosBrowser()); setDismissed(installed || storedUntil > Date.now());
    const handleBeforeInstall = (event: Event) => { event.preventDefault(); if (!isStandalone() && storedUntil <= Date.now()) setDeferredPrompt(event as BeforeInstallPromptEvent); };
    const handleInstalled = () => { setDeferredPrompt(null); setDismissed(true); setIosHelpOpen(false); };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall); window.addEventListener("appinstalled", handleInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", handleBeforeInstall); window.removeEventListener("appinstalled", handleInstalled); };
  }, []);

  const canShow = !dismissed && !isStandalone() && (Boolean(deferredPrompt) || ios);
  const dismiss = () => { window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION)); setDismissed(true); setIosHelpOpen(false); };
  const installAndroid = async () => { if (!deferredPrompt) return; await deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; if (choice.outcome === "accepted") setDismissed(true); setDeferredPrompt(null); };

  if (!canShow) return null;
  return <><section dir="rtl" aria-label="تثبيت التطبيق" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-[1.6rem] border border-teal-100 bg-white/95 p-3 shadow-[0_18px_48px_rgba(8,37,56,.22)] backdrop-blur-xl sm:bottom-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#082538] text-white"><Smartphone className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-black text-[#082538]">ثبّت اطلب أونلاين</p><p className="mt-0.5 text-xs font-medium text-slate-500">افتحه سريعًا من شاشة الهاتف مثل أي تطبيق.</p></div><button type="button" onClick={dismiss} aria-label="إخفاء دعوة التثبيت" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-2 gap-2">{deferredPrompt ? <button type="button" onClick={installAndroid} className="flex items-center justify-center gap-2 rounded-xl bg-[#082538] px-3 py-2.5 text-xs font-extrabold text-white transition active:scale-[.97]"><Download className="h-4 w-4" /> تثبيت الآن</button> : <button type="button" onClick={() => setIosHelpOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#082538] px-3 py-2.5 text-xs font-extrabold text-white transition active:scale-[.97]"><Share className="h-4 w-4" /> طريقة التثبيت</button>}<button type="button" onClick={dismiss} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">لاحقًا</button></div></section>{iosHelpOpen && <div dir="rtl" role="dialog" aria-modal="true" aria-labelledby="ios-install-title" className="fixed inset-0 z-[70] grid place-items-end bg-slate-950/35 p-3 sm:place-items-center"><section className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.14em] text-teal-700">Safari على iPhone</p><h2 id="ios-install-title" className="mt-2 text-xl font-black text-[#082538]">أضف التطبيق إلى الشاشة الرئيسية</h2></div><button type="button" onClick={() => setIosHelpOpen(false)} aria-label="إغلاق" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><ol className="mt-6 space-y-4 text-sm font-bold text-slate-700"><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">1</span><span>افتح الموقع في متصفح <strong>Safari</strong> ثم اضغط زر المشاركة <Share className="mx-1 inline h-4 w-4 text-teal-700" /> أسفل الشاشة.</span></li><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">2</span><span>مرّر القائمة واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> <PlusSquare className="mx-1 inline h-4 w-4 text-teal-700" />.</span></li><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">3</span><span>اضغط <strong>«إضافة»</strong>، وستظهر أيقونة اطلب أونلاين بين تطبيقاتك.</span></li></ol><button type="button" onClick={dismiss} className="mt-6 w-full rounded-xl bg-[#082538] px-4 py-3 text-sm font-extrabold text-white">فهمت</button></section></div>}</>;
}
