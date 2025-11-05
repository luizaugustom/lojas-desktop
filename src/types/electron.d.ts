// Tipos TypeScript para Electron API

export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  theme: {
    getSystemTheme: () => Promise<'light' | 'dark'>;
    getSystemColorScheme: () => Promise<{ accent: string; theme: 'light' | 'dark' }>;
    onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => void;
  };
  devices: {
    getComputerId: () => Promise<string>;
    getSystemInfo: () => Promise<any>;
  };
  // printers removido - funcionalidades de impressão removidas
  scales: {
    list: () => Promise<any[]>;
    connect: (port: string) => Promise<void>;
    read: (port: string) => Promise<string | null>;
    disconnect: (port: string) => Promise<void>;
    checkDrivers: () => Promise<any>;
    installDrivers: () => Promise<void>;
  };
  updater: {
    checkForUpdates: () => Promise<void>;
    restartAndInstall: () => Promise<void>;
    onUpdateChecking: (callback: () => void) => (() => void) | void;
    onUpdateAvailable: (callback: (info: any) => void) => (() => void) | void;
    onUpdateNotAvailable: (callback: (info: any) => void) => (() => void) | void;
    onUpdateError: (callback: (error: string) => void) => (() => void) | void;
    onUpdateProgress: (callback: (progress: any) => void) => (() => void) | void;
    onUpdateDownloaded: (callback: (info: any) => void) => (() => void) | void;
    onUpdateReadyToInstall?: (callback: (data: any) => void) => (() => void) | void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

