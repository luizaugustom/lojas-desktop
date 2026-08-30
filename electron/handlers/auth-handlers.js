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
import { ipcMain, app, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
var TOKEN_FILE = 'auth_token.dat';
function getTokenPath() {
    return path.join(app.getPath('userData'), TOKEN_FILE);
}
/** Lê o token JWT persistido pelo renderer (usado pelo job de sync no main). */
export function readStoredAuthToken() {
    var tokenPath = getTokenPath();
    try {
        if (!fs.existsSync(tokenPath)) {
            return null;
        }
        var data = fs.readFileSync(tokenPath, { encoding: 'utf8' });
        var buf = Buffer.from(data, 'base64');
        if (safeStorage.isEncryptionAvailable()) {
            try {
                return safeStorage.decryptString(buf);
            }
            catch (_a) {
                return buf.toString('utf8');
            }
        }
        return buf.toString('utf8');
    }
    catch (_b) {
        return null;
    }
}
export function registerAuthHandlers() {
    var _this = this;
    ipcMain.handle('auth:set-token', function (_event, token) { return __awaiter(_this, void 0, void 0, function () {
        var tokenPath, encrypted;
        return __generator(this, function (_a) {
            tokenPath = getTokenPath();
            try {
                if (!token) {
                    if (fs.existsSync(tokenPath)) {
                        fs.unlinkSync(tokenPath);
                    }
                    return [2 /*return*/, true];
                }
                if (safeStorage.isEncryptionAvailable()) {
                    encrypted = safeStorage.encryptString(token);
                    fs.writeFileSync(tokenPath, encrypted.toString('base64'), { mode: 384 });
                }
                else {
                    fs.writeFileSync(tokenPath, Buffer.from(token, 'utf8').toString('base64'), { mode: 384 });
                }
                return [2 /*return*/, true];
            }
            catch (err) {
                console.error('auth:set-token error', err);
                return [2 /*return*/, false];
            }
            return [2 /*return*/];
        });
    }); });
    ipcMain.handle('auth:get-token', function () { return __awaiter(_this, void 0, void 0, function () {
        var tokenPath, data, buf;
        return __generator(this, function (_a) {
            tokenPath = getTokenPath();
            try {
                if (!fs.existsSync(tokenPath)) {
                    return [2 /*return*/, null];
                }
                data = fs.readFileSync(tokenPath, { encoding: 'utf8' });
                buf = Buffer.from(data, 'base64');
                if (safeStorage.isEncryptionAvailable()) {
                    try {
                        return [2 /*return*/, safeStorage.decryptString(buf)];
                    }
                    catch (_b) {
                        return [2 /*return*/, buf.toString('utf8')];
                    }
                }
                return [2 /*return*/, buf.toString('utf8')];
            }
            catch (_c) {
                return [2 /*return*/, null];
            }
            return [2 /*return*/];
        });
    }); });
}
