import { ipcMain } from 'electron';
import { machineIdSync } from 'node-machine-id';
import os from 'os';

let cachedComputerId: string | null = null;

function getComputerIdOnce(): string {
  if (cachedComputerId) return cachedComputerId;
  try {
    cachedComputerId = machineIdSync();
    return cachedComputerId;
  } catch {
    cachedComputerId = os.hostname();
    return cachedComputerId;
  }
}

export function registerDeviceHandlers() {
  // Obter ID único do computador (cacheado para evitar chamadas síncronas repetidas)
  ipcMain.handle('get-computer-id', async () => {
    return getComputerIdOnce();
  });

  // Obter informações do sistema
  ipcMain.handle('get-system-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      osType: os.type(),
      osRelease: os.release(),
      osVersion: os.version(),
    };
  });
}

