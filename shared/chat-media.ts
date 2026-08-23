export const MAX_AUDIO_BYTES = 5_000_000;
export const AUDIO_MIME_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"] as const;
export type AudioMimeType = (typeof AUDIO_MIME_TYPES)[number];

export function validateAudioUpload(bytes: number, mimeType: string, durationSeconds: number) {
  return AUDIO_MIME_TYPES.includes(mimeType as AudioMimeType) && bytes > 0 && bytes <= MAX_AUDIO_BYTES && Number.isInteger(durationSeconds) && durationSeconds >= 1 && durationSeconds <= 600;
}
