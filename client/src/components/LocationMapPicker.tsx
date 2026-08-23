import { MapView } from "@/components/Map";
import { LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type MapLocation = { address: string; latitude?: number; longitude?: number };

type Target = "pickup" | "destination";

export function LocationMapPicker({ pickup, destination, onChange }: { pickup: MapLocation; destination: MapLocation; onChange: (target: Target, location: MapLocation) => void }) {
  const [activeTarget, setActiveTarget] = useState<Target>("pickup");
  const [search, setSearch] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const activeTargetRef = useRef<Target>(activeTarget);
  const markerRef = useRef<Record<Target, google.maps.Marker | null>>({ pickup: null, destination: null });

  useEffect(() => { activeTargetRef.current = activeTarget; }, [activeTarget]);

  const drawMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    const addMarker = (target: Target, location: MapLocation, title: string) => {
      if (markerRef.current[target]) markerRef.current[target]?.setMap(null);
      if (typeof location.latitude !== "number" || typeof location.longitude !== "number") return;
      markerRef.current[target] = new window.google.maps.Marker({ map: mapRef.current!, position: { lat: location.latitude, lng: location.longitude }, title, label: target === "pickup" ? "A" : "B" });
    };
    addMarker("pickup", pickup, "موقع الاستلام");
    addMarker("destination", destination, "موقع التسليم");
  }, [pickup, destination]);

  useEffect(() => { if (mapReady) drawMarkers(); }, [mapReady, drawMarkers]);

  const choosePoint = useCallback((target: Target, latitude: number, longitude: number, address?: string) => {
    onChange(target, { latitude, longitude, address: address || (target === "pickup" ? "موقع الاستلام المحدد على الخريطة" : "موقع التسليم المحدد على الخريطة") });
    mapRef.current?.panTo({ lat: latitude, lng: longitude });
  }, [onChange]);

  const onMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (event.latLng) choosePoint(activeTargetRef.current, event.latLng.lat(), event.latLng.lng());
    });
  }, [choosePoint]);

  const searchPlace = () => {
    if (!search.trim() || !window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: `${search.trim()}، الغردقة، مصر` }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const result = results[0];
        choosePoint(activeTarget, result.geometry.location.lat(), result.geometry.location.lng(), result.formatted_address);
      }
    });
  };

  const useCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition((position) => choosePoint(activeTarget, position.coords.latitude, position.coords.longitude, "موقعي الحالي"));
  };

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setActiveTarget("pickup")} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${activeTarget === "pickup" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>تحديد الاستلام</button><button type="button" onClick={() => setActiveTarget("destination")} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${activeTarget === "destination" ? "bg-[#ff7954] text-white" : "bg-slate-100 text-slate-600"}`}>تحديد التسليم</button><button type="button" onClick={useCurrentLocation} className="mr-auto inline-flex items-center gap-1 rounded-xl border border-teal-200 px-3 py-2 text-xs font-extrabold text-teal-800"><LocateFixed className="h-3.5 w-3.5" /> موقعي</button></div><div className="mt-3 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); searchPlace(); } }} placeholder="ابحث عن مكان داخل الغردقة" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-teal-500" /><button type="button" onClick={searchPlace} className="rounded-xl bg-[#082538] px-3 text-white"><Search className="h-4 w-4" /></button></div><p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500"><MapPin className="h-3.5 w-3.5 text-teal-700" /> اختر النقطة النشطة ثم اضغط على الخريطة أو ابحث عن مكان.</p></div><MapView className="h-[300px] sm:h-[360px]" initialCenter={{ lat: 27.2579, lng: 33.8116 }} initialZoom={13} onMapReady={onMapReady} /></div>;
}
