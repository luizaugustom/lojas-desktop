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
import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { app } from 'electron';
var execAsync = promisify(exec);
// Simulação de conexão com balança (em produção, usar biblioteca específica)
var scaleConnections = new Map();
export function registerScaleHandlers() {
    var _this = this;
    // Listar portas seriais disponíveis (balanças)
    ipcMain.handle('scales-list', function () { return __awaiter(_this, void 0, void 0, function () {
        var stdout, ports, stdout, ports, stdout, ports, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    if (!(process.platform === 'win32')) return [3 /*break*/, 2];
                    return [4 /*yield*/, execAsync('powershell -Command "Get-WmiObject Win32_SerialPort | Select-Object DeviceID, Description, Name | ConvertTo-Json"')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    ports = JSON.parse(stdout);
                    return [2 /*return*/, Array.isArray(ports) ? ports : [ports]];
                case 2:
                    if (!(process.platform === 'darwin')) return [3 /*break*/, 4];
                    return [4 /*yield*/, execAsync('ls /dev/tty.*')];
                case 3:
                    stdout = (_a.sent()).stdout;
                    ports = stdout.split('\n')
                        .filter(function (line) { return line.includes('tty.'); })
                        .map(function (line) { return ({
                        DeviceID: line.trim(),
                        Description: 'Serial Port',
                        Name: line.trim(),
                    }); });
                    return [2 /*return*/, ports];
                case 4: return [4 /*yield*/, execAsync('ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo ""')];
                case 5:
                    stdout = (_a.sent()).stdout;
                    ports = stdout.split('\n')
                        .filter(function (line) { return line.trim(); })
                        .map(function (line) { return ({
                        DeviceID: line.trim(),
                        Description: 'Serial Port',
                        Name: line.trim(),
                    }); });
                    return [2 /*return*/, ports];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error('Erro ao listar portas seriais:', error_1);
                    return [2 /*return*/, []];
                case 8: return [2 /*return*/];
            }
        });
    }); });
    // Conectar à balança
    ipcMain.handle('scales-connect', function (_event, port) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                // Em produção, usar biblioteca como 'serialport' para conectar
                // Por enquanto, simular conexão
                scaleConnections.set(port, {
                    port: port,
                    connected: true,
                    connectedAt: new Date(),
                });
                console.log("Conectado \u00E0 balan\u00E7a na porta ".concat(port));
            }
            catch (error) {
                console.error('Erro ao conectar à balança:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    }); });
    // Ler peso da balança
    ipcMain.handle('scales-read', function (_event, port) { return __awaiter(_this, void 0, void 0, function () {
        var connection;
        return __generator(this, function (_a) {
            try {
                connection = scaleConnections.get(port);
                if (!connection || !connection.connected) {
                    throw new Error('Balança não conectada');
                }
                // Em produção, ler dados reais da porta serial
                // Por enquanto, retornar valor simulado
                return [2 /*return*/, '1.250 kg'];
            }
            catch (error) {
                console.error('Erro ao ler balança:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    }); });
    // Desconectar da balança
    ipcMain.handle('scales-disconnect', function (_event, port) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                scaleConnections.delete(port);
                console.log("Desconectado da balan\u00E7a na porta ".concat(port));
            }
            catch (error) {
                console.error('Erro ao desconectar balança:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    }); });
    // Verificar drivers de balança
    ipcMain.handle('scales-check-drivers', function () { return __awaiter(_this, void 0, void 0, function () {
        var stdout, devices, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!(process.platform === 'win32')) return [3 /*break*/, 2];
                    return [4 /*yield*/, execAsync('powershell -Command "Get-PnpDevice | Where-Object {$_.Class -eq \'Ports\'} | Select-Object FriendlyName, Status | ConvertTo-Json"')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    devices = JSON.parse(stdout);
                    return [2 /*return*/, {
                            installed: Array.isArray(devices) ? devices : [devices],
                            needsInstall: false,
                        }];
                case 2: return [2 /*return*/, {
                        installed: [],
                        needsInstall: false,
                    }];
                case 3:
                    error_2 = _a.sent();
                    console.error('Erro ao verificar drivers de balança:', error_2);
                    return [2 /*return*/, {
                            installed: [],
                            needsInstall: true,
                        }];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Instalar drivers de balança
    ipcMain.handle('scales-install-drivers', function () { return __awaiter(_this, void 0, void 0, function () {
        var driversPath;
        return __generator(this, function (_a) {
            try {
                driversPath = path.join(app.getPath('userData'), 'drivers', 'scales');
                console.log('Instalando drivers de balança...');
                return [2 /*return*/];
            }
            catch (error) {
                console.error('Erro ao instalar drivers de balança:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    }); });
}
