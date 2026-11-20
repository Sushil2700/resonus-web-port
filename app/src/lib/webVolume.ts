/** Browser volume is device-local and available before the first audio plays. */
export const DEFAULT_WEB_VOLUME = 0.2;
const VOLUME_KEY = 'resonus.webVolume';
const UNMUTED_KEY = 'resonus.webUnmutedVolume';

function read(key: string, fallback: number): number {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null || raw.trim() === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
  } catch {
    return fallback;
  }
}

let lastUnmuted = read(UNMUTED_KEY, DEFAULT_WEB_VOLUME) || DEFAULT_WEB_VOLUME;

export function readWebVolume(): number {
  const volume = read(VOLUME_KEY, DEFAULT_WEB_VOLUME);
  if (volume > 0) lastUnmuted = volume;
  return volume;
}

export function saveWebVolume(volume: number): void {
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) return;
  if (volume > 0) lastUnmuted = volume;
  try {
    globalThis.localStorage?.setItem(VOLUME_KEY, String(volume));
    globalThis.localStorage?.setItem(UNMUTED_KEY, String(lastUnmuted));
  } catch {
    // Keep the current session's unmute level even if browser storage is blocked.
  }
}

export function webUnmuteVolume(): number {
  return lastUnmuted;
}
