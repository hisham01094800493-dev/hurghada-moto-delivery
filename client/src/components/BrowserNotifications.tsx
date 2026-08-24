import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BellRing, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const preferenceKey = "hurghada-delivery-browser-notifications";

function readPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(preferenceKey) === "enabled";
}

export function BrowserNotificationManager() {
  const { isAuthenticated } = useAuth();
  const notifications = trpc.support.notifications.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5000 });
  const knownIds = useRef(new Set<number>());
  const initialized = useRef(false);

  useEffect(() => {
    const rows = notifications.data;
    if (!rows?.length) return;
    if (!initialized.current) {
      rows.forEach((notification) => knownIds.current.add(notification.id));
      initialized.current = true;
      return;
    }
    const incoming = rows.filter((notification) => !knownIds.current.has(notification.id));
    incoming.forEach((notification) => knownIds.current.add(notification.id));
    if (!incoming.length) return;
    incoming.reverse().forEach((notification) => {
      if (window.localStorage.getItem("hgd-notifications-enabled") !== "0") toast.info(notification.title, { description: notification.body });
      if (readPreference() && "Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, { body: notification.body, icon: "/manus-storage/hurghada-moto-app-icon_235868ff.png", tag: `delivery-${notification.id}` });
      }
    });
  }, [notifications.data]);

  return null;
}

export function BrowserNotificationToggle({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = useState(readPreference);
  const supported = typeof window !== "undefined" && "Notification" in window;

  const toggle = async () => {
    if (!supported) { toast.error("متصفحك لا يدعم تنبيهات النظام."); return; }
    if (enabled) {
      window.localStorage.setItem(preferenceKey, "disabled");
      setEnabled(false);
      toast.success("تم إيقاف تنبيهات المتصفح على هذا الجهاز.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { toast.error("لم يتم منح إذن التنبيهات. يمكنك تفعيله من إعدادات المتصفح."); return; }
    window.localStorage.setItem(preferenceKey, "enabled");
    setEnabled(true);
    new Notification("تم تفعيل التنبيهات", { body: "سننبهك بالدعوات وتغيّرات حالة الطلب أثناء فتح التطبيق.", icon: "/manus-storage/hurghada-moto-app-icon_235868ff.png" });
    toast.success("تم تفعيل تنبيهات المتصفح.");
  };

  return <button type="button" aria-label={enabled ? "إيقاف تنبيهات المتصفح" : "تفعيل تنبيهات المتصفح"} title={enabled ? "إيقاف تنبيهات المتصفح" : "تفعيل تنبيهات المتصفح"} onClick={toggle} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition active:scale-[.97] ${enabled ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
    {enabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
    {!compact && (enabled ? "التنبيهات مفعّلة" : "تفعيل تنبيهات المتصفح")}
  </button>;
}
