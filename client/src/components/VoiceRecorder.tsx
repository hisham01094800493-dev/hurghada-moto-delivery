import { Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function VoiceRecorder({ disabled, onRecorded }: { disabled?: boolean; onRecorded: (blob: Blob, durationSeconds: number) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => () => { recorderRef.current?.stream.getTracks().forEach((track) => track.stop()); }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("المتصفح لا يدعم تسجيل الرسائل الصوتية."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = []; startedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)); onRecorded(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }), duration); setRecording(false); };
      recorder.start(); recorderRef.current = recorder; setElapsed(0); setRecording(true);
    } catch { toast.error("تعذر الوصول إلى الميكروفون. تحقق من الإذن ثم حاول مرة أخرى."); }
  };
  const stop = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();
  const cancel = () => { if (recorderRef.current?.state === "recording") { recorderRef.current.onstop = () => { recorderRef.current?.stream.getTracks().forEach((track) => track.stop()); setRecording(false); }; recorderRef.current.stop(); } else setRecording(false); };
  useEffect(() => { if (!recording) return; const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)), 500); return () => window.clearInterval(timer); }, [recording]);

  return recording ? <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-700"><span className="min-w-8 text-center text-xs font-black tabular-nums">{elapsed}s</span><button type="button" onClick={stop} className="rounded-lg bg-rose-600 p-2 text-white" aria-label="إيقاف التسجيل"><Square className="h-4 w-4 fill-current" /></button><button type="button" onClick={cancel} className="rounded-lg p-2" aria-label="إلغاء التسجيل"><X className="h-4 w-4" /></button></div> : <button type="button" disabled={disabled} onClick={start} className="rounded-xl border border-slate-200 p-3 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50" aria-label="تسجيل رسالة صوتية"><Mic className="h-5 w-5" /></button>;
}
