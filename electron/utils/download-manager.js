/**
 * Gerenciador de downloads de drivers
 * Implementa download HTTP/HTTPS com progresso e verificação de integridade
 */
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
import https from 'https';
import http from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { app } from 'electron';
import crypto from 'crypto';
/**
 * Faz download de um arquivo com suporte a progresso
 */
export function downloadFile(options) {
    return __awaiter(this, void 0, void 0, function () {
        var url, destination, expectedHash, _a, hashAlgorithm, onProgress, _b, timeout, _c, retries, destDir, lastError, _loop_1, attempt, state_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    url = options.url, destination = options.destination, expectedHash = options.expectedHash, _a = options.hashAlgorithm, hashAlgorithm = _a === void 0 ? 'sha256' : _a, onProgress = options.onProgress, _b = options.timeout, timeout = _b === void 0 ? 300000 : _b, _c = options.retries, retries = _c === void 0 ? 3 : _c;
                    destDir = path.dirname(destination);
                    return [4 /*yield*/, fs.mkdir(destDir, { recursive: true })];
                case 1:
                    _d.sent();
                    lastError = null;
                    _loop_1 = function (attempt) {
                        var result, calculatedHash, verified, _e, error_1, _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    _g.trys.push([0, 10, , 17]);
                                    if (!(attempt > 0)) return [3 /*break*/, 2];
                                    console.log("Tentativa ".concat(attempt + 1, " de ").concat(retries + 1, " para baixar ").concat(url));
                                    // Aguardar antes de tentar novamente (backoff exponencial)
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, Math.pow(2, attempt) * 1000); })];
                                case 1:
                                    // Aguardar antes de tentar novamente (backoff exponencial)
                                    _g.sent();
                                    _g.label = 2;
                                case 2: return [4 /*yield*/, downloadFileAttempt({
                                        url: url,
                                        destination: destination,
                                        onProgress: onProgress,
                                        timeout: timeout,
                                    })];
                                case 3:
                                    result = _g.sent();
                                    if (!expectedHash) return [3 /*break*/, 7];
                                    return [4 /*yield*/, calculateFileHash(destination, hashAlgorithm)];
                                case 4:
                                    calculatedHash = _g.sent();
                                    verified = calculatedHash.toLowerCase() === expectedHash.toLowerCase();
                                    if (!!verified) return [3 /*break*/, 6];
                                    return [4 /*yield*/, fs.unlink(destination).catch(function () { })];
                                case 5:
                                    _g.sent();
                                    throw new Error("Verifica\u00E7\u00E3o de integridade falhou. Esperado: ".concat(expectedHash, ", Obtido: ").concat(calculatedHash));
                                case 6:
                                    result.verified = true;
                                    result.hash = calculatedHash;
                                    return [3 /*break*/, 9];
                                case 7:
                                    // Calcular hash mesmo se não fornecido para referência
                                    _e = result;
                                    return [4 /*yield*/, calculateFileHash(destination, hashAlgorithm)];
                                case 8:
                                    // Calcular hash mesmo se não fornecido para referência
                                    _e.hash = _g.sent();
                                    _g.label = 9;
                                case 9: return [2 /*return*/, { value: result }];
                                case 10:
                                    error_1 = _g.sent();
                                    lastError = error_1;
                                    console.error("Erro no download (tentativa ".concat(attempt + 1, "):"), error_1.message);
                                    if (!(attempt < retries)) return [3 /*break*/, 16];
                                    _g.label = 11;
                                case 11:
                                    _g.trys.push([11, 14, , 15]);
                                    if (!existsSync(destination)) return [3 /*break*/, 13];
                                    return [4 /*yield*/, fs.unlink(destination)];
                                case 12:
                                    _g.sent();
                                    _g.label = 13;
                                case 13: return [3 /*break*/, 15];
                                case 14:
                                    _f = _g.sent();
                                    return [3 /*break*/, 15];
                                case 15: return [2 /*return*/, "continue"];
                                case 16: return [3 /*break*/, 17];
                                case 17: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _d.label = 2;
                case 2:
                    if (!(attempt <= retries)) return [3 /*break*/, 5];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 3:
                    state_1 = _d.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _d.label = 4;
                case 4:
                    attempt++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, {
                        success: false,
                        filePath: destination,
                        error: (lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Falha no download após todas as tentativas',
                    }];
            }
        });
    });
}
/**
 * Tenta fazer download do arquivo
 */
function downloadFileAttempt(options) {
    return new Promise(function (resolve, reject) {
        var url = options.url, destination = options.destination, onProgress = options.onProgress, timeout = options.timeout;
        var isHttps = url.startsWith('https://');
        var client = isHttps ? https : http;
        var file = createWriteStream(destination);
        var receivedBytes = 0;
        var totalBytes = 0;
        var startTime = Date.now();
        var lastProgressTime = Date.now();
        var lastProgressBytes = 0;
        var request = client.get(url, function (response) {
            // Verificar status code
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Redirecionamento
                file.close();
                fs.unlink(destination).catch(function () { });
                if (response.headers.location) {
                    return downloadFileAttempt({
                        url: response.headers.location,
                        destination: destination,
                        onProgress: onProgress,
                        timeout: timeout,
                    }).then(resolve).catch(reject);
                }
                return reject(new Error('Redirecionamento sem URL de destino'));
            }
            if (response.statusCode && response.statusCode >= 400) {
                file.close();
                fs.unlink(destination).catch(function () { });
                return reject(new Error("HTTP ".concat(response.statusCode, ": ").concat(response.statusMessage)));
            }
            // Obter tamanho total do arquivo
            totalBytes = parseInt(response.headers['content-length'] || '0', 10);
            response.on('data', function (chunk) {
                receivedBytes += chunk.length;
                file.write(chunk);
                // Calcular progresso
                var now = Date.now();
                var timeDiff = (now - lastProgressTime) / 1000; // segundos
                var bytesDiff = receivedBytes - lastProgressBytes;
                var speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
                if (onProgress) {
                    onProgress({
                        received: receivedBytes,
                        total: totalBytes || receivedBytes,
                        percentage: totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0,
                        speed: speed,
                    });
                }
                lastProgressTime = now;
                lastProgressBytes = receivedBytes;
            });
            response.on('end', function () {
                file.end();
                resolve({
                    success: true,
                    filePath: destination,
                });
            });
        });
        request.on('error', function (error) {
            file.close();
            fs.unlink(destination).catch(function () { });
            reject(error);
        });
        request.setTimeout(timeout, function () {
            request.destroy();
            file.close();
            fs.unlink(destination).catch(function () { });
            reject(new Error('Timeout no download'));
        });
        file.on('error', function (error) {
            request.destroy();
            fs.unlink(destination).catch(function () { });
            reject(error);
        });
    });
}
/**
 * Calcula hash de um arquivo
 */
function calculateFileHash(filePath_1) {
    return __awaiter(this, arguments, void 0, function (filePath, algorithm) {
        var hash, fileBuffer;
        if (algorithm === void 0) { algorithm = 'sha256'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hash = crypto.createHash(algorithm);
                    return [4 /*yield*/, fs.readFile(filePath)];
                case 1:
                    fileBuffer = _a.sent();
                    hash.update(fileBuffer);
                    return [2 /*return*/, hash.digest('hex')];
            }
        });
    });
}
/**
 * Obtém caminho do diretório de cache de drivers
 */
export function getDriversCacheDir() {
    return path.join(app.getPath('userData'), 'drivers', 'printers', 'cache');
}
/**
 * Verifica se arquivo já está em cache
 */
export function getCachedFile(fileName, expectedHash) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheDir, cachedPath, hash, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheDir = getDriversCacheDir();
                    cachedPath = path.join(cacheDir, fileName);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    // Verificar se arquivo existe
                    if (!existsSync(cachedPath)) {
                        return [2 /*return*/, null];
                    }
                    if (!expectedHash) return [3 /*break*/, 4];
                    return [4 /*yield*/, calculateFileHash(cachedPath, 'sha256')];
                case 2:
                    hash = _a.sent();
                    if (!(hash.toLowerCase() !== expectedHash.toLowerCase())) return [3 /*break*/, 4];
                    // Hash não confere, remover arquivo corrompido
                    return [4 /*yield*/, fs.unlink(cachedPath)];
                case 3:
                    // Hash não confere, remover arquivo corrompido
                    _a.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/, cachedPath];
                case 5:
                    error_2 = _a.sent();
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Adiciona arquivo ao cache
 */
export function cacheFile(sourcePath, fileName) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheDir, cachedPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheDir = getDriversCacheDir();
                    return [4 /*yield*/, fs.mkdir(cacheDir, { recursive: true })];
                case 1:
                    _a.sent();
                    cachedPath = path.join(cacheDir, fileName);
                    return [4 /*yield*/, fs.copyFile(sourcePath, cachedPath)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, cachedPath];
            }
        });
    });
}
/**
 * Limpa cache antigo (mantém apenas os últimos N dias)
 */
export function cleanOldCache() {
    return __awaiter(this, arguments, void 0, function (daysToKeep) {
        var cacheDir, files, now, maxAge, _i, files_1, file, filePath, stats, error_3, error_4;
        if (daysToKeep === void 0) { daysToKeep = 30; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheDir = getDriversCacheDir();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    return [4 /*yield*/, fs.readdir(cacheDir)];
                case 2:
                    files = _a.sent();
                    now = Date.now();
                    maxAge = daysToKeep * 24 * 60 * 60 * 1000;
                    _i = 0, files_1 = files;
                    _a.label = 3;
                case 3:
                    if (!(_i < files_1.length)) return [3 /*break*/, 10];
                    file = files_1[_i];
                    filePath = path.join(cacheDir, file);
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 8, , 9]);
                    return [4 /*yield*/, fs.stat(filePath)];
                case 5:
                    stats = _a.sent();
                    if (!(now - stats.mtime.getTime() > maxAge)) return [3 /*break*/, 7];
                    return [4 /*yield*/, fs.unlink(filePath)];
                case 6:
                    _a.sent();
                    console.log("Arquivo antigo removido do cache: ".concat(file));
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_3 = _a.sent();
                    return [3 /*break*/, 9];
                case 9:
                    _i++;
                    return [3 /*break*/, 3];
                case 10: return [3 /*break*/, 12];
                case 11:
                    error_4 = _a.sent();
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
