import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES, validateAudioUpload } from "./chat-media";

describe("chat audio validation", () => {
  it("accepts supported audio within the safe limits", () => {
    expect(validateAudioUpload(120_000, "audio/webm", 18)).toBe(true);
  });
  it("rejects oversized, unsupported, and excessively long audio", () => {
    expect(validateAudioUpload(MAX_AUDIO_BYTES + 1, "audio/webm", 18)).toBe(false);
    expect(validateAudioUpload(120_000, "video/mp4", 18)).toBe(false);
    expect(validateAudioUpload(120_000, "audio/ogg", 601)).toBe(false);
  });
});
