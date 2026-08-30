import { contextBridge, ipcRenderer } from 'electron';
// Expor APIs protegidas para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Controles de janela
    window: {
        minimize: function () { return ipcRenderer.invoke('window-minimize'); },
        maximize: function () { return ipcRenderer.invoke('window-maximize'); },
        close: function () { return ipcRenderer.invoke('window-close'); },
        isMaximized: function () { return ipcRenderer.invoke('window-is-maximized'); },
    },
    // Abrir URL em uma nova janela do app
    external: {
        openWindow: function (url) {
            return ipcRenderer.invoke('open-external-window', url);
        },
    },
    // Tema do sistema
    theme: {
        getSystemTheme: function () { return ipcRenderer.invoke('get-system-theme'); },
        getSystemColorScheme: function () { return ipcRenderer.invoke('get-system-color-scheme'); },
        onThemeChanged: function (callback) {
            ipcRenderer.on('theme-changed', function (_event, theme) { return callback(theme); });
        },
    },
    // Dispositivos
    devices: {
        getComputerId: function () { return ipcRenderer.invoke('get-computer-id'); },
        getSystemInfo: function () { return ipcRenderer.invoke('get-system-info'); },
    },
    // Token de acesso (armazenamento seguro no processo main)
    auth: {
        setToken: function (token) { return ipcRenderer.invoke('auth:set-token', token); },
        getToken: function () { return ipcRenderer.invoke('auth:get-token'); },
    },
    // Impressoras
    printers: {
        list: function () { return ipcRenderer.invoke('printers-list'); },
        getDefault: function () { return ipcRenderer.invoke('printers-get-default'); },
        print: function (payload) { return ipcRenderer.invoke('print-content', payload); },
        test: function (printerName) { return ipcRenderer.invoke('printers-test', printerName); },
    },
    // Balanças
    scales: {
        list: function () { return ipcRenderer.invoke('scales-list'); },
        connect: function (port) { return ipcRenderer.invoke('scales-connect', port); },
        read: function (port) { return ipcRenderer.invoke('scales-read', port); },
        disconnect: function (port) { return ipcRenderer.invoke('scales-disconnect', port); },
        checkDrivers: function () { return ipcRenderer.invoke('scales-check-drivers'); },
        installDrivers: function () { return ipcRenderer.invoke('scales-install-drivers'); },
    },
    // Notificações nativas do SO
    notifications: {
        show: function (payload) { return ipcRenderer.invoke('notifications:show', payload); },
        isSupported: function () { return ipcRenderer.invoke('notifications:is-supported'); },
        onNavigate: function (callback) {
            var handler = function (_event, p) { return callback(p); };
            ipcRenderer.on('navigate', handler);
            return function () { return ipcRenderer.removeListener('navigate', handler); };
        },
    },
    // Atualizações
    updater: {
        checkForUpdates: function () { return ipcRenderer.invoke('check-for-updates'); },
        restartAndInstall: function () { return ipcRenderer.invoke('restart-and-install-update'); },
        onUpdateChecking: function (callback) {
            var handler = function () { return callback(); };
            ipcRenderer.on('update-checking', handler);
            // Retornar função de cleanup
            return function () { return ipcRenderer.removeListener('update-checking', handler); };
        },
        onUpdateAvailable: function (callback) {
            var handler = function (_event, info) { return callback(info); };
            ipcRenderer.on('update-available', handler);
            // Retornar função de cleanup
            return function () { return ipcRenderer.removeListener('update-available', handler); };
        },
        onUpdateNotAvailable: function (callback) {
            var handler = function (_event, info) { return callback(info); };
            ipcRenderer.on('update-not-available', handler);
            // Retornar função de cleanup
            return function () { return ipcRenderer.removeListener('update-not-available', handler); };
        },
        onUpdateError: function (callback) {
            var handler = function (_event, error) { return callback(error); };
            ipcRenderer.on('update-error', handler);
            // Retornar função de cleanup
            return function () { return ipcRenderer.removeListener('update-error', handler); };
        },
        onUpdateProgress: function (callback) {
            var handler = function (_event, progress) { return callback(progress); };
            ipcRenderer.on('update-progress', handler);
            // Retornar função de cleanup
            return function () { return ipcRenderer.removeListener('update-progress', handler); };
        },
        onUpdateDownloaded: function (callback) {
            var handler = function (_event, info) { return callback(info); };
            ipcRenderer.on('update-downloaded', handler);
            // Retornar função de cleanup
            return function () { return ipcRenderer.removeListener('update-downloaded', handler); };
        },
        onUpdateReadyToInstall: function (callback) {
            var handler = function (_event, data) { return callback(data); };
            ipcRenderer.on('update-ready-to-install', handler);
            // Retornar função de cleanup
            return function () { return ipcRenderer.removeListener('update-ready-to-install', handler); };
        },
    },
});
// Types são declarados em src/types/electron.d.ts
