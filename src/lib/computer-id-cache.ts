/**
 * Cache do computerId no renderer para evitar múltiplas chamadas IPC.
 */

let cachedComputerId: string | null = null;
let cachePromise: Promise<string> | null = null;

export async function getComputerIdCached(): Promise<string> {
  if (cachedComputerId) return cachedComputerId;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.devices?.getComputerId) {
      cachedComputerId = await window.electronAPI.devices.getComputerId();
      return cachedComputerId;
    }
    const fallback = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    cachedComputerId = fallback;
    return fallback;
  })();
  return cachePromise;
}
