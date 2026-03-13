import { ipcMain, app, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const TOKEN_FILE = 'auth_token.dat';

function getTokenPath(): string {
  return path.join(app.getPath('userData'), TOKEN_FILE);
}

export function registerAuthHandlers() {
  ipcMain.handle('auth:set-token', async (_event, token: string | null) => {
    const tokenPath = getTokenPath();
    try {
      if (!token) {
        if (fs.existsSync(tokenPath)) {
          fs.unlinkSync(tokenPath);
        }
        return true;
      }
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token);
        fs.writeFileSync(tokenPath, encrypted.toString('base64'), { mode: 0o600 });
      } else {
        fs.writeFileSync(tokenPath, Buffer.from(token, 'utf8').toString('base64'), { mode: 0o600 });
      }
      return true;
    } catch (err) {
      console.error('auth:set-token error', err);
      return false;
    }
  });

  ipcMain.handle('auth:get-token', async () => {
    const tokenPath = getTokenPath();
    try {
      if (!fs.existsSync(tokenPath)) {
        return null;
      }
      const data = fs.readFileSync(tokenPath, { encoding: 'utf8' });
      const buf = Buffer.from(data, 'base64');
      if (safeStorage.isEncryptionAvailable()) {
        try {
          return safeStorage.decryptString(buf);
        } catch {
          return buf.toString('utf8');
        }
      }
      return buf.toString('utf8');
    } catch {
      return null;
    }
  });
}
