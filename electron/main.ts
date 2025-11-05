import { app, BrowserWindow, ipcMain, nativeTheme, systemPreferences } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as path from 'path';
import * as fs from 'fs';
import { registerDeviceHandlers } from './handlers/device-handlers';
// registerPrinterHandlers removido - funcionalidades de impressão removidas
import { registerScaleHandlers } from './handlers/scale-handlers';
// registerPrinterDriverHandlers removido - funcionalidades de impressão removidas
// impressao-handler removido - funcionalidades de impressão removidas

// Configurar log
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Aplicação iniciando...');

let mainWindow: BrowserWindow | null = null;

// Detectar ambiente de desenvolvimento
// Em produção (empacotado), app.isPackaged será true
// Em desenvolvimento, NODE_ENV pode ser 'development' ou app.isPackaged será false
const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.ELECTRON_IS_DEV !== '0');

// Configurar auto-updater (apenas em produção)
if (!isDev) {
  try {
    autoUpdater.logger = log;
    
    // Configurar atualizações automáticas
    autoUpdater.autoDownload = true; // Baixar automaticamente quando disponível
    autoUpdater.autoInstallOnAppQuit = false; // Desabilitar instalação automática - vamos controlar manualmente
    
    // Garantir que o updater use o appId correto para evitar conflitos
    // O appId é lido automaticamente do package.json, mas vamos garantir que está correto
    log.info('App ID configurado:', app.getName());
    log.info('Versão atual:', app.getVersion());
  // log.info('App ID completo:', app.getAppId()); // Removido: propriedade não existe
    
    // Configurar o feed URL explicitamente para evitar problemas de cache
    // O electron-updater usa automaticamente o GitHub quando provider é github no package.json
    // Mas vamos garantir que está configurado corretamente
    const updateServerUrl = 'https://github.com/luizaugustom/montshop-desktop/releases/latest';
    log.info('URL de atualização configurada:', updateServerUrl);
    
    // Verificar atualizações ao iniciar (apenas uma vez)
    // Aguardar a janela estar pronta antes de verificar
    app.whenReady().then(() => {
      setTimeout(() => {
        if (!updateCheckInProgress) {
          updateCheckInProgress = true;
          log.info('Verificando atualizações na inicialização...');
          autoUpdater.checkForUpdates().catch((err) => {
            log.error('Erro ao verificar atualizações:', err);
            updateCheckInProgress = false;
          });
        }
      }, 3000); // Aguardar 3 segundos após a janela estar pronta
    });
    
    // Verificar atualizações periodicamente (a cada 4 horas)
    setInterval(() => {
      if (!updateCheckInProgress) {
        updateCheckInProgress = true;
        log.info('Verificando atualizações periodicamente...');
        autoUpdater.checkForUpdates().catch((err) => {
          log.error('Erro ao verificar atualizações periodicamente:', err);
          updateCheckInProgress = false;
        });
      }
    }, 4 * 60 * 60 * 1000); // 4 horas em milissegundos
    
    log.info('Auto-updater configurado: download automático e instalação ao fechar');
  } catch (error) {
    log.warn('Erro ao configurar auto-updater:', error);
  }
}

// Função para encontrar o index.html em produção
function findIndexHtml(): string {
  // app.getAppPath() retorna o caminho correto tanto em dev quanto em produção (incluindo dentro do asar)
  const appPath = app.getAppPath();
  const indexPath = path.join(appPath, 'dist', 'index.html');
  
  log.info('App path:', appPath);
  log.info('Tentando carregar index.html de:', indexPath);
  
  // Verificar se o arquivo existe (pode falhar para asar, mas loadFile funciona)
  try {
    // Para asar, não conseguimos usar existsSync, mas loadFile funciona
    if (!appPath.includes('.asar')) {
      if (fs.existsSync(indexPath)) {
        log.info('Index.html encontrado em:', indexPath);
        return indexPath;
      }
    } else {
      // Está dentro do asar, loadFile vai funcionar mesmo sem existsSync
      log.info('App está empacotado (asar), usando caminho:', indexPath);
      return indexPath;
    }
  } catch (error) {
    log.warn('Erro ao verificar caminho:', error);
  }

  // Fallback: caminho relativo
  const fallbackPath = path.join(__dirname, '../dist/index.html');
  log.warn('Usando caminho fallback:', fallbackPath);
  return fallbackPath;
}

// Definir o ícone da aplicação
function getIconPath() {
  if (isDev) {
    return path.join(__dirname, '../../public/logo.png');
  }
  // Em produção, o ícone está no resources do app
  const iconPath = path.join(process.resourcesPath, 'logo.png');
  const fs = require('fs');
  if (fs.existsSync(iconPath)) {
    return iconPath;
  }
  // Fallback: tentar no diretório dist
  const distIcon = path.join(__dirname, '../dist/logo.png');
  if (fs.existsSync(distIcon)) {
    return distIcon;
  }
  // Se não encontrar, retorna undefined para usar o padrão
  return undefined;
}

function createWindow() {
  // Definir o ícone da aplicação
  const iconPath = getIconPath();
  
  // Definir o ícone da aplicação globalmente (se existir)
  if (iconPath && require('fs').existsSync(iconPath)) {
    try {
  // app.setIcon(iconPath); // Removido: propriedade não existe
    } catch (error) {
      log.warn('Erro ao definir ícone:', error);
    }
  }

  const windowOptions: any = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    frame: false, // Janela sem bordas para customização total
    titleBarStyle: 'hidden',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false, // Não mostrar até carregar
    transparent: false,
  };

  // Adicionar ícone apenas se existir
  if (iconPath && require('fs').existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Tratamento de erros
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Falha ao carregar:', errorCode, errorDescription);
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('crashed', () => {
    log.error('Renderer process crashed');
  });

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('Renderer process is unresponsive');
  });

  // Carregar aplicação
  if (isDev) {
    // Apenas em desenvolvimento: carregar do servidor Vite
    log.info('Modo desenvolvimento: carregando de http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      log.error('Erro ao carregar URL:', err);
      // Se falhar, mostrar janela mesmo assim para debug
      mainWindow?.show();
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Em produção: carregar do arquivo local
    log.info('Modo produção: carregando arquivo local');
    // Encontrar o index.html em produção
  let indexPath = findIndexHtml();
    
    log.info('Carregando aplicação de:', indexPath);
    log.info('__dirname:', __dirname);
    log.info('process.resourcesPath:', process.resourcesPath);
    log.info('app.getAppPath():', app.getAppPath());
    
    // Usar loadFile que funciona tanto com arquivos normais quanto com asar
    mainWindow.loadFile(indexPath).catch((err) => {
      log.error('Erro ao carregar arquivo:', err);
      log.error('Código de erro:', (err as any)?.code);
      log.error('Caminho tentado:', indexPath);
      
      // Tentar carregar via loadURL se loadFile falhar
      try {
        const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`;
        log.info('Tentando carregar via URL:', fileUrl);
        if (mainWindow) {
          mainWindow.loadURL(fileUrl).catch((urlErr) => {
            log.error('Erro ao carregar URL:', urlErr);
            // Mostrar janela mesmo com erro para debug
            mainWindow?.show();
          });
        }
      } catch (urlError) {
        log.error('Erro ao tentar loadURL:', urlError);
        mainWindow?.show();
      }
    });
  }

  // Mostrar janela quando pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Focar na janela
    if (mainWindow) {
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Aplicar tema do sistema
  nativeTheme.on('updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });
}

// Handlers IPC
function setupIpcHandlers() {
  // Controles de janela customizados
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() || false;
  });

  // Tema do sistema
  ipcMain.handle('get-system-theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  ipcMain.handle('get-system-color-scheme', async () => {
    if (process.platform === 'darwin') {
      // macOS
      const accent = systemPreferences.getAccentColor();
      const systemColors = {
        accent: `#${accent}`,
        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      };
      return systemColors;
    } else if (process.platform === 'win32') {
      // Windows
  // 'accent' não é suportado, usar cor padrão ou uma cor suportada
  const accent = await systemPreferences.getColor('active-border');
      const systemColors = {
        accent,
        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      };
      return systemColors;
    }
    return {
      accent: '#0078d4',
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    };
  });

  // Registrar handlers de dispositivos
  registerDeviceHandlers();
  // registerPrinterHandlers() removido - funcionalidades de impressão removidas
  registerScaleHandlers();
  // registerPrinterDriverHandlers() removido - funcionalidades de impressão removidas
}

// App lifecycle
app.whenReady().then(() => {
  log.info('App pronto, criando janela...');
  try {
    // Registrar handlers IPC ANTES de criar a janela para evitar race conditions
    setupIpcHandlers();
    createWindow();
    log.info('Janela criada com sucesso');
  } catch (error) {
    log.error('Erro ao criar janela:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  log.error('Erro ao inicializar app:', error);
});

// Variáveis para rastrear estado de atualização
let updateDownloadedAndReady = false;
let isInstallingUpdate = false;
let updateCheckInProgress = false;

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  log.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Promise rejeitada não tratada:', reason);
});

// Handler para fechamento de janela
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Se houver uma atualização baixada, instalar antes de fechar
    if (!isDev && updateDownloadedAndReady && !isInstallingUpdate) {
      log.info('Fechando aplicação e instalando atualização...');
      isInstallingUpdate = true;
      // Dar um pequeno delay para garantir que a janela feche corretamente
      setTimeout(() => {
        try {
          autoUpdater.quitAndInstall(false, true);
        } catch (error) {
          log.error('Erro ao instalar atualização:', error);
          // Se falhar, apenas fechar o app
          app.quit();
        }
      }, 1000); // Aumentado para 1 segundo para garantir estabilidade
    } else if (!isInstallingUpdate) {
      app.quit();
    }
  }
});

// Antes de fechar, verificar se há atualização para instalar
app.on('before-quit', (event) => {
  if (!isDev && updateDownloadedAndReady && !isInstallingUpdate) {
    log.info('Atualização pendente detectada, instalando antes de fechar...');
    // Prevenir o fechamento normal para instalar a atualização
    event.preventDefault();
    isInstallingUpdate = true;
    
    // Fechar todas as janelas primeiro
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    
    // Pequeno delay para garantir que tudo esteja pronto antes de instalar
    setTimeout(() => {
      try {
        log.info('Iniciando instalação da atualização...');
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        log.error('Erro ao instalar atualização no before-quit:', error);
        // Se falhar, apenas fechar o app
        isInstallingUpdate = false;
        app.quit();
      }
    }, 1000); // Aumentado para 1 segundo para garantir estabilidade
  }
});

// Variáveis para controlar notificações duplicadas
let updateAvailableNotified = false;
let updateDownloadedNotified = false;

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  log.info('Verificando atualizações...');
  if (mainWindow) {
    mainWindow.webContents.send('update-checking');
  }
});

autoUpdater.on('update-available', (info) => {
  log.info('Atualização disponível:', info.version);
  log.info('Informações completas da atualização:', JSON.stringify(info, null, 2));
  log.info('Versão atual instalada:', app.getVersion());
  
  // Verificar se a versão disponível é realmente mais nova
  const currentVersion = app.getVersion();
  const availableVersion = info.version;
  
  if (availableVersion === currentVersion) {
    log.warn('A versão disponível é igual à atual. Isso pode indicar um problema no latest.yml do GitHub.');
    log.warn('Por favor, verifique se o release correto está marcado como "latest" no GitHub.');
    // Não iniciar download se a versão for a mesma
    return;
  }
  
  log.info('Iniciando download automático da atualização...');
  
  // Prevenir notificações duplicadas
  if (!updateAvailableNotified) {
    updateAvailableNotified = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('update-available', info);
      } catch (error) {
        log.error('Erro ao enviar notificação de atualização disponível:', error);
      }
    }
  }
  // O download começa automaticamente porque autoDownload = true
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Aplicação está atualizada:', info.version);
  updateCheckInProgress = false; // Resetar flag quando não há atualização
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  log.error('Erro no auto-updater:', err);
  log.error('Detalhes do erro:', JSON.stringify(err, null, 2));
  
  // Resetar flag em caso de erro
  updateCheckInProgress = false;
  
  // Se houver uma janela disponível, notificar o usuário apenas para erros críticos
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      // Apenas enviar erros que não sejam de rede (já tratados no frontend)
      const errorMessage = err.message || String(err);
      if (!errorMessage.includes('net::') && 
          !errorMessage.includes('ECONNREFUSED') &&
          !errorMessage.includes('timeout')) {
        mainWindow.webContents.send('update-error', errorMessage);
      }
    } catch (error) {
      log.error('Erro ao enviar notificação de erro:', error);
    }
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Atualização baixada com sucesso:', info.version);
  log.info('Informações completas da atualização baixada:', JSON.stringify(info, null, 2));
  log.info('Versão atual instalada:', app.getVersion());
  log.info('Versão baixada:', info.version);
  
  // Verificar se a versão baixada é realmente diferente da atual
  const currentVersion = app.getVersion();
  const downloadedVersion = info.version;
  
  if (downloadedVersion === currentVersion) {
    log.error('ERRO: A versão baixada é igual à versão atual! Isso indica um problema no latest.yml do GitHub.');
    log.error('Por favor, verifique se o release da versão ' + downloadedVersion + ' está marcado como "latest" no GitHub.');
    log.error('O arquivo latest.yml deve apontar para a versão correta.');
    // Não marcar como pronta para instalar se a versão for a mesma
    return;
  }
  
  log.info('A atualização será instalada automaticamente quando o aplicativo for fechado.');
  
  updateDownloadedAndReady = true; // Marcar que há atualização pronta
  updateCheckInProgress = false; // Resetar flag quando download completo
  
  // Prevenir notificações duplicadas
  if (!updateDownloadedNotified) {
    updateDownloadedNotified = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('update-downloaded', info);
        // Notificar o usuário que a atualização foi baixada e será instalada
        mainWindow.webContents.send('update-ready-to-install', {
          version: info.version,
          message: 'Atualização baixada! Será instalada automaticamente quando você fechar o aplicativo.'
        });
      } catch (error) {
        log.error('Erro ao enviar notificação de atualização baixada:', error);
      }
    }
  }
});

// Handler para reiniciar e instalar atualização
ipcMain.handle('restart-and-install-update', () => {
  if (!isInstallingUpdate && updateDownloadedAndReady) {
    log.info('Usuário solicitou reiniciar e instalar atualização');
    isInstallingUpdate = true;
    
    // Fechar todas as janelas primeiro
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    
    // Pequeno delay para garantir que tudo esteja pronto
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        log.error('Erro ao instalar atualização manualmente:', error);
        isInstallingUpdate = false;
        app.quit();
      }
    }, 1000);
  } else {
    log.warn('Tentativa de instalar atualização quando não há atualização disponível ou já está instalando');
  }
});

// Handler para verificar atualizações manualmente
ipcMain.handle('check-for-updates', async () => {
  if (!updateCheckInProgress) {
    updateCheckInProgress = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      log.error('Erro ao verificar atualizações manualmente:', err);
      updateCheckInProgress = false;
    }
  }
});

