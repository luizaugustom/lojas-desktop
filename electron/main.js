var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { app, BrowserWindow, ipcMain, nativeTheme, systemPreferences, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as path from 'path';
import * as fs from 'fs';
import { registerDeviceHandlers } from './handlers/device-handlers';
import { registerPrinterHandlers } from './handlers/printer-handlers';
import { registerScaleHandlers } from './handlers/scale-handlers';
import { registerAuthHandlers, readStoredAuthToken } from './handlers/auth-handlers';
import { registerNotificationHandlers } from './handlers/notification-handlers';
import axios from 'axios';
// registerPrinterDriverHandlers removido - funcionalidades de impressão removidas
// impressao-handler removido - funcionalidades de impressão removidas
// Configurar log
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Aplicação iniciando...');
var mainWindow = null;
// Detectar ambiente de desenvolvimento
// Em produção (empacotado), app.isPackaged será true
// Em desenvolvimento, NODE_ENV pode ser 'development' ou app.isPackaged será false
var isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.ELECTRON_IS_DEV !== '0');
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
        var updateServerUrl = 'https://github.com/luizaugustom/montshop-desktop/releases/latest';
        log.info('URL de atualização configurada:', updateServerUrl);
        // Verificar atualizações ao iniciar (apenas uma vez)
        // Aguardar a janela estar pronta antes de verificar
        app.whenReady().then(function () {
            setTimeout(function () {
                if (!updateCheckInProgress) {
                    updateCheckInProgress = true;
                    log.info('Verificando atualizações na inicialização...');
                    autoUpdater.checkForUpdates().catch(function (err) {
                        log.error('Erro ao verificar atualizações:', err);
                        updateCheckInProgress = false;
                    });
                }
            }, 3000); // Aguardar 3 segundos após a janela estar pronta
        });
        // Verificar atualizações periodicamente (a cada 4 horas)
        setInterval(function () {
            if (!updateCheckInProgress) {
                updateCheckInProgress = true;
                log.info('Verificando atualizações periodicamente...');
                autoUpdater.checkForUpdates().catch(function (err) {
                    log.error('Erro ao verificar atualizações periodicamente:', err);
                    updateCheckInProgress = false;
                });
            }
        }, 4 * 60 * 60 * 1000); // 4 horas em milissegundos
        log.info('Auto-updater configurado: download automático e instalação ao fechar');
    }
    catch (error) {
        log.warn('Erro ao configurar auto-updater:', error);
    }
}
// ============================================================================
// ATO DIAT 38/2020 — Sincronização periódica de NFC-e contingenciais
// ============================================================================
/**
 * Job periódico que tenta sincronizar NFC-e em contingência pendentes
 * com a SEFAZ (via FocusNFE). Disparado a cada 5 minutos.
 *
 * Conforme ATO DIAT 38/2020, NFC-e emitidas em contingência devem ser
 * enviadas à SEFAZ assim que o ambiente for restabelecido.
 */
var contingencySyncInProgress = false;
function startContingencySyncJob() {
    var _this = this;
    setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
        var apiBaseUrl, token, response, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (contingencySyncInProgress)
                        return [2 /*return*/];
                    contingencySyncInProgress = true;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    apiBaseUrl = process.env.VITE_API_URL || 'https://api.montshop.app';
                    token = readStoredAuthToken();
                    if (!token)
                        return [2 /*return*/];
                    return [4 /*yield*/, axios.post("".concat(apiBaseUrl, "/fiscal/contingencia/sincronizar-todos"), {}, {
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                'Content-Type': 'application/json',
                            },
                            timeout: 120000,
                        })];
                case 2:
                    response = _a.sent();
                    data = response.data;
                    if ((data === null || data === void 0 ? void 0 : data.total) > 0) {
                        log.info("[ATO DIAT 38/2020] Sync conting\u00EAncia: ".concat(data.sucessos, "/").concat(data.total, " sincronizados, ").concat(data.erros, " erro(s)."));
                    }
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    log.error('Erro no job de sincronização de contingência:', err_1);
                    return [3 /*break*/, 5];
                case 4:
                    contingencySyncInProgress = false;
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, 5 * 60 * 1000); // 5 minutos
    log.info('[ATO DIAT 38/2020] Job periódico de sincronização de contingência iniciado (5min).');
}
// Função para encontrar o index.html em produção
function findIndexHtml() {
    // app.getAppPath() retorna o caminho correto tanto em dev quanto em produção (incluindo dentro do asar)
    var appPath = app.getAppPath();
    var indexPath = path.join(appPath, 'dist', 'index.html');
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
        }
        else {
            // Está dentro do asar, loadFile vai funcionar mesmo sem existsSync
            log.info('App está empacotado (asar), usando caminho:', indexPath);
            return indexPath;
        }
    }
    catch (error) {
        log.warn('Erro ao verificar caminho:', error);
    }
    // Fallback: caminho relativo
    var fallbackPath = path.join(__dirname, '../dist/index.html');
    log.warn('Usando caminho fallback:', fallbackPath);
    return fallbackPath;
}
// Definir o ícone da aplicação
function getIconPath() {
    if (isDev) {
        // Em desenvolvimento, usar .ico no Windows se disponível
        if (process.platform === 'win32') {
            var devIco = path.join(__dirname, '../build/icon.ico');
            if (fs.existsSync(devIco)) {
                return devIco;
            }
        }
        return path.join(__dirname, '../public/logo.png');
    }
    // No Windows, preferir .ico para melhor qualidade e compatibilidade
    if (process.platform === 'win32') {
        // Em produção, o ícone .ico está no resources do app
        var icoPath = path.join(process.resourcesPath, 'icon.ico');
        if (fs.existsSync(icoPath)) {
            return icoPath;
        }
        // Fallback: tentar no diretório build
        var buildIco = path.join(__dirname, '../build/icon.ico');
        if (fs.existsSync(buildIco)) {
            return buildIco;
        }
    }
    // Em produção, o ícone PNG está no resources do app (para Mac/Linux)
    var iconPath = path.join(process.resourcesPath, 'logo.png');
    if (fs.existsSync(iconPath)) {
        return iconPath;
    }
    // Fallback: tentar no diretório public
    var publicIcon = path.join(__dirname, '../public/logo.png');
    if (fs.existsSync(publicIcon)) {
        return publicIcon;
    }
    // Fallback: tentar no diretório dist
    var distIcon = path.join(__dirname, '../dist/logo.png');
    if (fs.existsSync(distIcon)) {
        return distIcon;
    }
    // Se não encontrar, retorna undefined para usar o padrão
    return undefined;
}
function createWindow() {
    // Definir o ícone da aplicação
    var iconPath = getIconPath();
    // Definir o ícone da aplicação globalmente (se existir)
    if (iconPath && require('fs').existsSync(iconPath)) {
        try {
            // app.setIcon(iconPath); // Removido: propriedade não existe
        }
        catch (error) {
            log.warn('Erro ao definir ícone:', error);
        }
    }
    var windowOptions = {
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        frame: false, // Janela sem bordas para customização total
        titleBarStyle: 'hidden',
        backgroundColor: nativeTheme.shouldUseDarkColors ? '#1F1F1F' : '#f7f7f7',
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
    // Permissões: geolocalização, câmera (QR) e notificações para o ponto eletrônico.
    // Electron exige RequestHandler + CheckHandler — sem o Check, APIs como
    // navigator.geolocation falham com PERMISSION_DENIED sem exibir o prompt.
    var allowPermission = function (permission) {
        return permission === 'geolocation' ||
            permission === 'notifications' ||
            permission === 'media';
    };
    mainWindow.webContents.session.setPermissionRequestHandler(function (_webContents, permission, callback) {
        callback(allowPermission(permission));
    });
    mainWindow.webContents.session.setPermissionCheckHandler(function (_webContents, permission) { return allowPermission(permission); });
    // Tratamento de erros
    mainWindow.webContents.on('did-fail-load', function (event, errorCode, errorDescription) {
        log.error('Falha ao carregar:', errorCode, errorDescription);
        if (isDev) {
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.openDevTools();
        }
    });
    mainWindow.webContents.on('crashed', function () {
        log.error('Renderer process crashed');
    });
    mainWindow.webContents.on('unresponsive', function () {
        log.warn('Renderer process is unresponsive');
    });
    // Carregar aplicação
    if (isDev) {
        // Apenas em desenvolvimento: carregar do servidor Vite
        log.info('Modo desenvolvimento: carregando de http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173').catch(function (err) {
            log.error('Erro ao carregar URL:', err);
            // Se falhar, mostrar janela mesmo assim para debug
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
        });
        mainWindow.webContents.openDevTools();
    }
    else {
        // Em produção: carregar do arquivo local
        log.info('Modo produção: carregando arquivo local');
        // Encontrar o index.html em produção
        var indexPath_1 = findIndexHtml();
        log.info('Carregando aplicação de:', indexPath_1);
        log.info('__dirname:', __dirname);
        log.info('process.resourcesPath:', process.resourcesPath);
        log.info('app.getAppPath():', app.getAppPath());
        // Usar loadFile que funciona tanto com arquivos normais quanto com asar
        mainWindow.loadFile(indexPath_1).catch(function (err) {
            log.error('Erro ao carregar arquivo:', err);
            log.error('Código de erro:', err === null || err === void 0 ? void 0 : err.code);
            log.error('Caminho tentado:', indexPath_1);
            // Tentar carregar via loadURL se loadFile falhar
            try {
                var fileUrl = "file://".concat(indexPath_1.replace(/\\/g, '/'));
                log.info('Tentando carregar via URL:', fileUrl);
                if (mainWindow) {
                    mainWindow.loadURL(fileUrl).catch(function (urlErr) {
                        log.error('Erro ao carregar URL:', urlErr);
                        // Mostrar janela mesmo com erro para debug
                        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
                    });
                }
            }
            catch (urlError) {
                log.error('Erro ao tentar loadURL:', urlError);
                mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
            }
        });
    }
    // Mostrar janela quando pronta
    mainWindow.once('ready-to-show', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
        // Focar na janela
        if (mainWindow) {
            mainWindow.focus();
        }
    });
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    // Abrir links externos no navegador padrão
    mainWindow.webContents.setWindowOpenHandler(function (_a) {
        var url = _a.url;
        // Abrir todos os links externos no navegador padrão
        shell.openExternal(url);
        return { action: 'deny' };
    });
    // Abrir links clicados no navegador padrão (para links com target="_blank" ou cliques em links externos)
    mainWindow.webContents.on('will-navigate', function (event, navigationUrl) {
        var currentUrl = mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.getURL();
        // Se não houver URL atual (primeira carga), permitir navegação
        if (!currentUrl) {
            return;
        }
        try {
            var parsedUrl = new URL(navigationUrl);
            var currentParsedUrl = new URL(currentUrl);
            // Se for um protocolo http/https e for um domínio diferente, abrir no navegador padrão
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                // Se for um domínio diferente, abrir no navegador padrão
                if (currentParsedUrl.hostname !== parsedUrl.hostname ||
                    currentParsedUrl.origin !== parsedUrl.origin) {
                    event.preventDefault();
                    shell.openExternal(navigationUrl);
                }
            }
        }
        catch (e) {
            // Se não conseguir parsear, permitir navegação normal
            log.warn('Erro ao processar URL de navegação:', e);
        }
    });
    // Aplicar tema do sistema
    nativeTheme.on('updated', function () {
        if (mainWindow) {
            mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
        }
    });
}
// Handlers IPC
function setupIpcHandlers() {
    var _this = this;
    // Controles de janela customizados
    ipcMain.handle('window-minimize', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.minimize();
    });
    ipcMain.handle('window-maximize', function () {
        if (mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.maximize();
        }
    });
    ipcMain.handle('window-close', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.close();
    });
    ipcMain.handle('window-is-maximized', function () {
        return (mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.isMaximized()) || false;
    });
    /**
     * Abre uma URL externa em uma nova janela BrowserWindow dedicada.
     * Usado pelo CTA "Abrir editor visual" do storefront para abrir o
     * front-lojas em uma janela do próprio app desktop, mantendo a
     * experiência unificada.
     *
     * Aceita apenas URLs http/https e do mesmo host configurado em
     * VITE_PUBLIC_SITE_URL (env do renderer) — defesa contra abuso.
     */
    ipcMain.handle('open-external-window', function (_event, url) { return __awaiter(_this, void 0, void 0, function () {
        var win, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!url || typeof url !== 'string') {
                        return [2 /*return*/, { success: false, error: 'URL inválida' }];
                    }
                    if (!/^https?:\/\//i.test(url)) {
                        return [2 /*return*/, { success: false, error: 'Apenas URLs http/https são permitidas' }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    win = new BrowserWindow({
                        width: 1280,
                        height: 860,
                        minWidth: 960,
                        minHeight: 640,
                        title: 'Editor do Catálogo',
                        autoHideMenuBar: true,
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            sandbox: true,
                        },
                    });
                    win.setMenuBarVisibility(false);
                    return [4 /*yield*/, win.loadURL(url)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    err_2 = _a.sent();
                    log.error('Falha ao abrir janela externa:', err_2);
                    return [2 /*return*/, { success: false, error: (err_2 === null || err_2 === void 0 ? void 0 : err_2.message) || 'Erro desconhecido' }];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Tema do sistema
    ipcMain.handle('get-system-theme', function () {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });
    ipcMain.handle('get-system-color-scheme', function () { return __awaiter(_this, void 0, void 0, function () {
        var accent, systemColors, accent, systemColors;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(process.platform === 'darwin')) return [3 /*break*/, 1];
                    accent = systemPreferences.getAccentColor();
                    systemColors = {
                        accent: "#".concat(accent),
                        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
                    };
                    return [2 /*return*/, systemColors];
                case 1:
                    if (!(process.platform === 'win32')) return [3 /*break*/, 3];
                    return [4 /*yield*/, systemPreferences.getColor('active-border')];
                case 2:
                    accent = _a.sent();
                    systemColors = {
                        accent: accent,
                        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
                    };
                    return [2 /*return*/, systemColors];
                case 3: return [2 /*return*/, {
                        accent: '#0078d4',
                        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
                    }];
            }
        });
    }); });
    // Registrar handlers de dispositivos
    registerDeviceHandlers();
    registerPrinterHandlers();
    registerScaleHandlers();
    registerAuthHandlers();
    registerNotificationHandlers();
}
// App lifecycle
app.whenReady().then(function () {
    log.info('App pronto, criando janela...');
    try {
        // Registrar handlers IPC ANTES de criar a janela para evitar race conditions
        setupIpcHandlers();
        createWindow();
        log.info('Janela criada com sucesso');
        // ATO DIAT 38/2020 — inicia job de sincronização de contingência
        startContingencySyncJob();
    }
    catch (error) {
        log.error('Erro ao criar janela:', error);
    }
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}).catch(function (error) {
    log.error('Erro ao inicializar app:', error);
});
// Variáveis para rastrear estado de atualização
var updateDownloadedAndReady = false;
var isInstallingUpdate = false;
var updateCheckInProgress = false;
// Tratamento de erros não capturados
process.on('uncaughtException', function (error) {
    log.error('Erro não capturado:', error);
});
process.on('unhandledRejection', function (reason, promise) {
    log.error('Promise rejeitada não tratada:', reason);
});
// Handler para fechamento de janela
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        // Se houver uma atualização baixada, instalar antes de fechar
        if (!isDev && updateDownloadedAndReady && !isInstallingUpdate) {
            log.info('Fechando aplicação e instalando atualização...');
            isInstallingUpdate = true;
            // Dar um pequeno delay para garantir que a janela feche corretamente
            setTimeout(function () {
                try {
                    autoUpdater.quitAndInstall(false, true);
                }
                catch (error) {
                    log.error('Erro ao instalar atualização:', error);
                    // Se falhar, apenas fechar o app
                    app.quit();
                }
            }, 1000); // Aumentado para 1 segundo para garantir estabilidade
        }
        else if (!isInstallingUpdate) {
            app.quit();
        }
    }
});
// Antes de fechar, verificar se há atualização para instalar
app.on('before-quit', function (event) {
    if (!isDev && updateDownloadedAndReady && !isInstallingUpdate) {
        log.info('Atualização pendente detectada, instalando antes de fechar...');
        // Prevenir o fechamento normal para instalar a atualização
        event.preventDefault();
        isInstallingUpdate = true;
        // Fechar todas as janelas primeiro
        var windows = BrowserWindow.getAllWindows();
        windows.forEach(function (window) {
            if (!window.isDestroyed()) {
                window.close();
            }
        });
        // Pequeno delay para garantir que tudo esteja pronto antes de instalar
        setTimeout(function () {
            try {
                log.info('Iniciando instalação da atualização...');
                autoUpdater.quitAndInstall(false, true);
            }
            catch (error) {
                log.error('Erro ao instalar atualização no before-quit:', error);
                // Se falhar, apenas fechar o app
                isInstallingUpdate = false;
                app.quit();
            }
        }, 1000); // Aumentado para 1 segundo para garantir estabilidade
    }
});
// Variáveis para controlar notificações duplicadas
var updateAvailableNotified = false;
var updateDownloadedNotified = false;
// Auto-updater events
autoUpdater.on('checking-for-update', function () {
    log.info('Verificando atualizações...');
    if (mainWindow) {
        mainWindow.webContents.send('update-checking');
    }
});
autoUpdater.on('update-available', function (info) {
    log.info('Atualização disponível:', info.version);
    log.info('Informações completas da atualização:', JSON.stringify(info, null, 2));
    log.info('Versão atual instalada:', app.getVersion());
    // Verificar se a versão disponível é realmente mais nova
    var currentVersion = app.getVersion();
    var availableVersion = info.version;
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
            }
            catch (error) {
                log.error('Erro ao enviar notificação de atualização disponível:', error);
            }
        }
    }
    // O download começa automaticamente porque autoDownload = true
});
autoUpdater.on('update-not-available', function (info) {
    log.info('Aplicação está atualizada:', info.version);
    updateCheckInProgress = false; // Resetar flag quando não há atualização
    if (mainWindow) {
        mainWindow.webContents.send('update-not-available', info);
    }
});
autoUpdater.on('error', function (err) {
    log.error('Erro no auto-updater:', err);
    log.error('Detalhes do erro:', JSON.stringify(err, null, 2));
    // Resetar flag em caso de erro
    updateCheckInProgress = false;
    // Se houver uma janela disponível, notificar o usuário apenas para erros críticos
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            // Apenas enviar erros que não sejam de rede (já tratados no frontend)
            var errorMessage = err.message || String(err);
            if (!errorMessage.includes('net::') &&
                !errorMessage.includes('ECONNREFUSED') &&
                !errorMessage.includes('timeout')) {
                mainWindow.webContents.send('update-error', errorMessage);
            }
        }
        catch (error) {
            log.error('Erro ao enviar notificação de erro:', error);
        }
    }
});
autoUpdater.on('download-progress', function (progressObj) {
    if (mainWindow) {
        mainWindow.webContents.send('update-progress', progressObj);
    }
});
autoUpdater.on('update-downloaded', function (info) {
    log.info('Atualização baixada com sucesso:', info.version);
    log.info('Informações completas da atualização baixada:', JSON.stringify(info, null, 2));
    log.info('Versão atual instalada:', app.getVersion());
    log.info('Versão baixada:', info.version);
    // Verificar se a versão baixada é realmente diferente da atual
    var currentVersion = app.getVersion();
    var downloadedVersion = info.version;
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
            }
            catch (error) {
                log.error('Erro ao enviar notificação de atualização baixada:', error);
            }
        }
    }
});
// Handler para reiniciar e instalar atualização
ipcMain.handle('restart-and-install-update', function () {
    if (!isInstallingUpdate && updateDownloadedAndReady) {
        log.info('Usuário solicitou reiniciar e instalar atualização');
        isInstallingUpdate = true;
        // Fechar todas as janelas primeiro
        var windows = BrowserWindow.getAllWindows();
        windows.forEach(function (window) {
            if (!window.isDestroyed()) {
                window.close();
            }
        });
        // Pequeno delay para garantir que tudo esteja pronto
        setTimeout(function () {
            try {
                autoUpdater.quitAndInstall(false, true);
            }
            catch (error) {
                log.error('Erro ao instalar atualização manualmente:', error);
                isInstallingUpdate = false;
                app.quit();
            }
        }, 1000);
    }
    else {
        log.warn('Tentativa de instalar atualização quando não há atualização disponível ou já está instalando');
    }
});
// Handler para verificar atualizações manualmente
ipcMain.handle('check-for-updates', function () { return __awaiter(void 0, void 0, void 0, function () {
    var err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!updateCheckInProgress) return [3 /*break*/, 4];
                updateCheckInProgress = true;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, autoUpdater.checkForUpdates()];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                err_3 = _a.sent();
                log.error('Erro ao verificar atualizações manualmente:', err_3);
                updateCheckInProgress = false;
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
