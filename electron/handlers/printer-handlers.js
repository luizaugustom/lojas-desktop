var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import { BrowserWindow, ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import iconv from 'iconv-lite';
import QRCode from 'qrcode';
var execAsync = promisify(exec);
var RECEIPT_CUT_MARKER = '<<CUT_RECEIPT>>';
// Cache de impressoras conectadas
var cachedPrinters = [];
var ESC = 0x1b;
var GS = 0x1d;
var DEFAULT_CODE_PAGE = 19; // ESC/POS: Code page 19 = CP858 (Português)
var DEFAULT_SERIAL_BAUD = 9600;
var NEW_LINE = Buffer.from('\n', 'ascii');
var PRINT_MARKER_REGEX = /<<(?:ESC_POS_BINARY:([A-Za-z0-9+/=]+)|NFC_E_QR:([^>\n]+))>>/g;
// Configuração padrão do cupom NFC-e renderizado em HTML (preview e impressoras USB/GDI).
// O cupom é gerado em texto puro com centerText(width=46) — 46 cols centradas por linha
// (casando com o buffer ESC/POS em printer.service.ts que usa NFC_LINE_WIDTH = 46).
// Em Courier New (ratio ≈ 0.6), 11px × 46 chars ≈ 80.3mm; ocupa toda a largura do papel
// 80mm (margens 0mm). Chars 10% maiores que 10px para o conteúdo ter mais presença visual
// e menos "fino". Layout ultra-compacto vertical: line-height 0.85, QR 120px.
var NFCE_HTML_RENDER = {
    pageSize: '80mm auto',
    bodyPadding: '0mm',
    bodyWidth: '80mm',
    bodyFontSize: '11px',
    bodyLineHeight: 0.85,
    qrImgPx: 120,
    qrWrapMargin: '2px 0',
};
var thermalPrinterModule = null;
var thermalPrinterLoadError = null;
function loadThermalPrinterModule() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (thermalPrinterLoadError) {
                        throw thermalPrinterLoadError;
                    }
                    if (!!thermalPrinterModule) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, import('node-thermal-printer')];
                case 2:
                    thermalPrinterModule = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    thermalPrinterLoadError = error_1 instanceof Error ? error_1 : new Error(String(error_1));
                    console.error('Módulo node-thermal-printer indisponível:', thermalPrinterLoadError.message);
                    throw thermalPrinterLoadError;
                case 4: return [2 /*return*/, thermalPrinterModule];
            }
        });
    });
}
function buildNativeQrEscPos(url, moduleSize) {
    if (moduleSize === void 0) { moduleSize = 2; }
    var data = Buffer.from(url, 'ascii');
    // Módulo 2 — QR compacto alinhado à fonte menor do cupom
    var size = Math.min(8, Math.max(2, moduleSize));
    var commands = [
        Buffer.from([0x1b, 0x61, 0x01]),
        Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
        Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]),
        Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),
    ];
    var storeLen = data.length + 3;
    var storeCmd = Buffer.alloc(8 + data.length);
    storeCmd[0] = 0x1d;
    storeCmd[1] = 0x28;
    storeCmd[2] = 0x6b;
    storeCmd[3] = storeLen & 0xff;
    storeCmd[4] = (storeLen >> 8) & 0xff;
    storeCmd[5] = 0x31;
    storeCmd[6] = 0x50;
    storeCmd[7] = 0x30;
    data.copy(storeCmd, 8);
    commands.push(storeCmd);
    commands.push(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));
    commands.push(Buffer.from([0x1b, 0x61, 0x00]));
    commands.push(Buffer.from('\n', 'utf8'));
    return Buffer.concat(commands);
}
function stripPrintMarkersForDisplay(content) {
    return content
        .replace(/<<ESC_POS_BINARY:[A-Za-z0-9+/=]+>>/g, '')
        .replace(/<<NFC_E_QR:[^>\n]+>>/g, '')
        .replace(/\n{3,}/g, '\n\n');
}
function decodePrintMarkerMatch(match) {
    if (match[1]) {
        try {
            return Buffer.from(match[1], 'base64');
        }
        catch (error) {
            console.warn('Falha ao decodificar ESC_POS_BINARY:', error);
            return null;
        }
    }
    if (match[2]) {
        return buildNativeQrEscPos(match[2]);
    }
    return null;
}
function parseEscPosSegment(segment) {
    var markerRegex = new RegExp(PRINT_MARKER_REGEX.source, 'g');
    if (!markerRegex.test(segment)) {
        return [{ kind: 'text', value: segment }];
    }
    markerRegex.lastIndex = 0;
    var parts = [];
    var lastIndex = 0;
    var match;
    while ((match = markerRegex.exec(segment)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ kind: 'text', value: segment.substring(lastIndex, match.index) });
        }
        var binary = decodePrintMarkerMatch(match);
        if (binary) {
            parts.push({ kind: 'binary', value: binary });
        }
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < segment.length) {
        parts.push({ kind: 'text', value: segment.substring(lastIndex) });
    }
    return parts.length > 0 ? parts : [{ kind: 'text', value: segment }];
}
function appendEscPosSegmentBuffers(buffers, segment, columns) {
    var parts = parseEscPosSegment(segment);
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        if (part.kind === 'binary') {
            buffers.push(part.value);
            continue;
        }
        var lines = formatContentForThermal(part.value, columns);
        for (var _a = 0, lines_1 = lines; _a < lines_1.length; _a++) {
            var line = lines_1[_a];
            var encodedLine = encodeForEscPos(line);
            if (encodedLine.length > 0) {
                buffers.push(encodedLine);
            }
            buffers.push(NEW_LINE);
        }
    }
}
function normalizePrintableContent(content) {
    var normalized = (content !== null && content !== void 0 ? content : '')
        .replace(/\r\n?/g, '\n')
        .normalize('NFC')
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
    var compatText = normalized.replace(/[^\u0000-\u00FF]/g, '?');
    var hasExtendedCharacters = normalized !== compatText;
    return {
        text: normalized,
        compatText: compatText,
        hasExtendedCharacters: hasExtendedCharacters,
    };
}
function ensureTrailingNewlines(value, minNewlines) {
    if (minNewlines === void 0) { minNewlines = 3; }
    var match = value.match(/\n*$/);
    var existingNewlines = match ? match[0].length : 0;
    if (existingNewlines >= minNewlines) {
        return value;
    }
    return value + '\n'.repeat(minNewlines - existingNewlines);
}
function splitReceiptCopies(content) {
    return content
        .split(RECEIPT_CUT_MARKER)
        .map(function (segment) { return segment.replace(/^\n+/, '').trimEnd(); })
        .filter(function (segment) { return segment.trim().length > 0; })
        .map(function (segment) { return ensureTrailingNewlines(segment); });
}
function encodeForEscPos(text) {
    var encodings = ['cp858', 'cp850', 'windows1252', 'latin1'];
    for (var _i = 0, encodings_1 = encodings; _i < encodings_1.length; _i++) {
        var encoding = encodings_1[_i];
        try {
            if (encoding === 'latin1') {
                return Buffer.from(text, 'latin1');
            }
            if (iconv.encodingExists(encoding)) {
                return iconv.encode(text, encoding);
            }
        }
        catch (error) {
            console.warn("Falha ao codificar texto usando ".concat(encoding, ":"), error);
        }
    }
    return Buffer.from(text, 'utf8');
}
function buildInitializationBuffer() {
    // ESC @ (reset) + ESC t 19 (CP858) + ESC M 1 (Fonte B — menor) + GS ! 0 (sem magnificação)
    return Buffer.from([
        ESC, 0x40,
        ESC, 0x74, DEFAULT_CODE_PAGE,
        ESC, 0x4d, 0x01,
        GS, 0x21, 0x00,
    ]);
}
function isSerialPort(port) {
    if (!(port === null || port === void 0 ? void 0 : port.trim())) {
        return false;
    }
    var normalized = port.trim().toLowerCase().replace(/:$/, '');
    // Windows USB001/USB002 são portas do spooler, NÃO serial — SerialPort.Open falha.
    // Serial real: COMx (Windows), /dev/tty* (Linux/mac), LPT (paralela).
    return (/^com\d+$/i.test(normalized) ||
        normalized.startsWith('/dev/tty') ||
        normalized.startsWith('lpt'));
}
function resolvePrinterPort(printerName, options) {
    return __awaiter(this, void 0, void 0, function () {
        var configured, cached, printers, found;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    configured = (_a = options === null || options === void 0 ? void 0 : options.port) === null || _a === void 0 ? void 0 : _a.trim();
                    if (configured) {
                        return [2 /*return*/, configured];
                    }
                    cached = (_b = cachedPrinters.find(function (printer) { return (printer === null || printer === void 0 ? void 0 : printer.name) === printerName; })) === null || _b === void 0 ? void 0 : _b.port;
                    if (typeof cached === 'string' && cached.trim()) {
                        return [2 /*return*/, cached.trim()];
                    }
                    return [4 /*yield*/, listPrinters()];
                case 1:
                    printers = _c.sent();
                    cachedPrinters = printers;
                    found = printers.find(function (printer) { return (printer === null || printer === void 0 ? void 0 : printer.name) === printerName; });
                    return [2 /*return*/, typeof (found === null || found === void 0 ? void 0 : found.port) === 'string' && found.port.trim() ? found.port.trim() : null];
            }
        });
    });
}
function buildSegmentEscPosBuffer(segment, columns, isLast, options) {
    var buffers = [buildInitializationBuffer()];
    appendEscPosSegmentBuffers(buffers, segment, columns);
    buffers.push(NEW_LINE, NEW_LINE, NEW_LINE);
    if ((options === null || options === void 0 ? void 0 : options.autoCut) !== false || !isLast) {
        buffers.push(Buffer.from([GS, 0x56, 0x00]));
    }
    return Buffer.concat(buffers);
}
function writeRawToSerialPort(port_1, data_1) {
    return __awaiter(this, arguments, void 0, function (port, data, baudRate) {
        var tempFile;
        if (baudRate === void 0) { baudRate = DEFAULT_SERIAL_BAUD; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(process.platform === 'win32')) return [3 /*break*/, 2];
                    return [4 /*yield*/, writeRawToSerialPortWindows(port, data, baudRate)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2:
                    tempFile = path.join(os.tmpdir(), "montshop-escpos-".concat(Date.now(), ".bin"));
                    fs.writeFileSync(tempFile, data);
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, , 5, 6]);
                    return [4 /*yield*/, execAsync("lp -o raw '".concat(tempFile.replace(/'/g, "'\\''"), "'"))];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    try {
                        fs.unlinkSync(tempFile);
                    }
                    catch (_b) {
                        // ignore
                    }
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function writeRawToSerialPortWindows(port, data, baudRate) {
    return __awaiter(this, void 0, void 0, function () {
        var comPort, tempFile, filePathPs, portPs, ps;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    comPort = port.trim().replace(/:$/, '');
                    tempFile = path.join(os.tmpdir(), "montshop-escpos-".concat(Date.now(), ".bin"));
                    fs.writeFileSync(tempFile, data);
                    filePathPs = tempFile.replace(/\\/g, '/').replace(/'/g, "''");
                    portPs = comPort.replace(/'/g, "''");
                    ps = [
                        "$portName='".concat(portPs, "'"),
                        "$filePath='".concat(filePathPs, "'"),
                        '$bytes=[System.IO.File]::ReadAllBytes($filePath)',
                        '$sp=New-Object System.IO.Ports.SerialPort $portName,' + baudRate + ',([System.IO.Ports.Parity]::None),8,([System.IO.Ports.StopBits]::One)',
                        '$sp.WriteTimeout=10000',
                        'try { $sp.Open(); $sp.Write($bytes,0,$bytes.Length); Start-Sleep -Milliseconds 300 } finally { if ($sp.IsOpen) { $sp.Close() }; $sp.Dispose() }',
                    ].join('; ');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, execAsync("powershell.exe -NoProfile -NonInteractive -Command \"".concat(ps, "\""))];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    try {
                        fs.unlinkSync(tempFile);
                    }
                    catch (_b) {
                        // ignore
                    }
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Imprime via porta serial (COM/USB) — evita corrupção do spooler Windows.
 * Necessário para QR Code ESC/POS em impressoras como Bematech MP-4200.
 */
function printWithSerialPort(printerName, content, options) {
    return __awaiter(this, void 0, void 0, function () {
        var port, columns, segments, parts, index, segment, isLast, buffer, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, resolvePrinterPort(printerName, options)];
                case 1:
                    port = _a.sent();
                    if (!port || !isSerialPort(port)) {
                        return [2 /*return*/, { success: false, error: 'Porta serial não identificada para a impressora' }];
                    }
                    columns = normalizePaperWidth(options);
                    segments = splitReceiptCopies(content);
                    parts = segments.length > 0 ? segments : [ensureTrailingNewlines(content)];
                    if (parts.length > 2) {
                        console.warn("N\u00FAmero de partes excedeu 2 (".concat(parts.length, "), usando apenas as 2 primeiras"));
                        parts.splice(2);
                    }
                    index = 0;
                    _a.label = 2;
                case 2:
                    if (!(index < parts.length)) return [3 /*break*/, 6];
                    segment = parts[index];
                    isLast = index === parts.length - 1;
                    buffer = buildSegmentEscPosBuffer(segment, columns, isLast, options);
                    return [4 /*yield*/, writeRawToSerialPort(port, buffer)];
                case 3:
                    _a.sent();
                    if (!(!isLast && parts.length === 2)) return [3 /*break*/, 5];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    index++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, { success: true }];
                case 7:
                    error_2 = _a.sent();
                    console.error('Erro ao imprimir via porta serial:', error_2);
                    return [2 /*return*/, { success: false, error: (error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || 'Erro na impressão serial' }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function getHtmlPaperStyle(paperSize, customPaperWidth) {
    if (paperSize === void 0) { paperSize = '80mm'; }
    switch (paperSize) {
        case '58mm':
            return {
                pageSize: '58mm auto',
                padding: '4mm',
                width: '50mm',
            };
        case 'a4':
            return {
                pageSize: '210mm 297mm',
                padding: '12mm',
                width: '180mm',
            };
        case 'custom': {
            var columns = customPaperWidth !== null && customPaperWidth !== void 0 ? customPaperWidth : 48;
            var widthMm = Math.max(45, Math.min(120, Math.round(columns * 1.7)));
            return {
                pageSize: "".concat(widthMm, "mm auto"),
                padding: '4mm',
                width: "".concat(Math.max(widthMm - 8, 40), "mm"),
            };
        }
        case '80mm':
        default:
            return {
                pageSize: NFCE_HTML_RENDER.pageSize,
                padding: NFCE_HTML_RENDER.bodyPadding,
                width: NFCE_HTML_RENDER.bodyWidth,
            };
    }
}
function buildHtmlDocument(content, options) {
    return __awaiter(this, void 0, void 0, function () {
        var paperStyle, copies, parts, htmlCopies, _i, parts_2, copy, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    paperStyle = getHtmlPaperStyle(options === null || options === void 0 ? void 0 : options.paperSize, options === null || options === void 0 ? void 0 : options.customPaperWidth);
                    copies = splitReceiptCopies(content);
                    parts = copies.length > 0 ? copies : [content];
                    htmlCopies = [];
                    _i = 0, parts_2 = parts;
                    _d.label = 1;
                case 1:
                    if (!(_i < parts_2.length)) return [3 /*break*/, 4];
                    copy = parts_2[_i];
                    _b = (_a = htmlCopies).push;
                    _c = "<div class=\"copy\">".concat;
                    return [4 /*yield*/, enrichHtmlWithQrMarkers(copy)];
                case 2:
                    _b.apply(_a, [_c.apply("<div class=\"copy\">", [_d.sent(), "</div>"])]);
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, "\n    <!DOCTYPE html>\n    <html>\n      <head>\n        <meta charset=\"utf-8\" />\n        <title>Impress\u00E3o Montshop</title>\n        <style>\n          @media print {\n            @page {\n              size: ".concat(paperStyle.pageSize, ";\n              margin: 0;\n            }\n            body {\n              margin: 0;\n              padding: ").concat(paperStyle.padding, ";\n              font-family: 'Courier New', monospace;\n            font-size: ").concat(NFCE_HTML_RENDER.bodyFontSize, ";\n            line-height: ").concat(NFCE_HTML_RENDER.bodyLineHeight, ";\n            width: ").concat(paperStyle.width, ";\n            }\n          }\n          body {\n            margin: 0;\n            padding: ").concat(paperStyle.padding, ";\n            font-family: 'Courier New', monospace;\n            font-size: ").concat(NFCE_HTML_RENDER.bodyFontSize, ";\n            line-height: ").concat(NFCE_HTML_RENDER.bodyLineHeight, ";\n            width: ").concat(paperStyle.width, ";\n            background: white;\n          }\n          .container {\n            display: flex;\n            flex-direction: column;\n            gap: 12mm;\n          }\n          .copy {\n            white-space: pre-wrap;\n            word-break: break-word;\n            margin: 0;\n            font-family: 'Courier New', monospace;\n            font-size: ").concat(NFCE_HTML_RENDER.bodyFontSize, ";\n            line-height: ").concat(NFCE_HTML_RENDER.bodyLineHeight, ";\n            text-align: center;\n          }\n          .copy > * {\n            margin: 0 auto;\n            text-align: center;\n          }\n          .copy:not(:last-child) {\n            page-break-after: always;\n          }\n          .qr-wrap {\n            text-align: center;\n            margin: ").concat(NFCE_HTML_RENDER.qrWrapMargin, ";\n            width: 100%;\n          }\n          .qr-wrap img {\n            display: block;\n            margin: 0 auto;\n            width: ").concat(NFCE_HTML_RENDER.qrImgPx, "px;\n            height: ").concat(NFCE_HTML_RENDER.qrImgPx, "px;\n            image-rendering: pixelated;\n          }\n        </style>\n      </head>\n      <body>\n        <div class=\"container\">").concat(htmlCopies.join(''), "</div>\n      </body>\n    </html>\n  ")];
            }
        });
    });
}
/**
 * Converte <<NFC_E_QR:url>> em <img> PNG para fallback HTML no Windows
 * (quando o driver USB/GDI não aceita ESC/POS raw).
 */
function enrichHtmlWithQrMarkers(content) {
    return __awaiter(this, void 0, void 0, function () {
        var markerRegex, chunks, lastIndex, match, escapeText, normalizeLines, qrUrl, dataUrl, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    markerRegex = new RegExp(PRINT_MARKER_REGEX.source, 'g');
                    chunks = [];
                    lastIndex = 0;
                    escapeText = function (text) { return escapeHtml(text); };
                    normalizeLines = function (text) {
                        return text
                            .split('\n')
                            .map(function (line) { return line.replace(/^\s+|\s+$/g, ''); })
                            .join('\n');
                    };
                    _b.label = 1;
                case 1:
                    if (!((match = markerRegex.exec(content)) !== null)) return [3 /*break*/, 6];
                    if (match.index > lastIndex) {
                        chunks.push(escapeText(normalizeLines(content.substring(lastIndex, match.index))));
                    }
                    qrUrl = (_a = match[2]) === null || _a === void 0 ? void 0 : _a.trim();
                    if (!qrUrl) return [3 /*break*/, 5];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, QRCode.toDataURL(qrUrl, {
                            errorCorrectionLevel: 'M',
                            margin: 1,
                            width: NFCE_HTML_RENDER.qrImgPx,
                            type: 'image/png',
                        })];
                case 3:
                    dataUrl = _b.sent();
                    chunks.push("<div class=\"qr-wrap\"><img src=\"".concat(dataUrl, "\" alt=\"QR Code NFC-e\" width=\"").concat(NFCE_HTML_RENDER.qrImgPx, "\" height=\"").concat(NFCE_HTML_RENDER.qrImgPx, "\" /></div>"));
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _b.sent();
                    console.warn('Falha ao gerar QR Code HTML:', error_3);
                    chunks.push(escapeText(qrUrl));
                    return [3 /*break*/, 5];
                case 5:
                    // ESC_POS_BINARY: omitir no HTML (sem decodificador visual)
                    lastIndex = match.index + match[0].length;
                    return [3 /*break*/, 1];
                case 6:
                    if (lastIndex < content.length) {
                        chunks.push(escapeText(normalizeLines(content.substring(lastIndex))));
                    }
                    return [2 /*return*/, chunks.join('')];
            }
        });
    });
}
function printWithHtmlRenderer(content, options) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var window = null;
                    var resolved = false;
                    var finish = function (result) {
                        if (!resolved) {
                            resolved = true;
                            resolve(result);
                        }
                        if (window && !window.isDestroyed()) {
                            window.close();
                        }
                    };
                    void (function () { return __awaiter(_this, void 0, void 0, function () {
                        var html, dataUrl, printerName_1, error_4;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, buildHtmlDocument(content, options)];
                                case 1:
                                    html = _a.sent();
                                    dataUrl = "data:text/html;charset=utf-8,".concat(encodeURIComponent(html));
                                    window = new BrowserWindow({
                                        width: 480,
                                        height: 720,
                                        show: false,
                                        webPreferences: {
                                            sandbox: true,
                                            nodeIntegration: false,
                                            contextIsolation: true,
                                        },
                                    });
                                    printerName_1 = (options === null || options === void 0 ? void 0 : options.printerName) || undefined;
                                    window.webContents.on('did-finish-load', function () {
                                        setTimeout(function () {
                                            if (!window || window.isDestroyed()) {
                                                finish({ success: false, error: 'Janela de impressão fechada prematuramente' });
                                                return;
                                            }
                                            window.webContents
                                                .print({
                                                silent: true,
                                                printBackground: true,
                                                deviceName: printerName_1,
                                            }, function (success, failureReason) {
                                                if (success) {
                                                    finish({ success: true });
                                                }
                                                else {
                                                    finish({
                                                        success: false,
                                                        error: failureReason || 'Falha na impressão HTML',
                                                    });
                                                }
                                            });
                                        }, 400);
                                    });
                                    window.webContents.on('did-fail-load', function (_e, _code, desc) {
                                        finish({ success: false, error: desc || 'Falha ao carregar HTML de impressão' });
                                    });
                                    return [4 /*yield*/, window.loadURL(dataUrl)];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_4 = _a.sent();
                                    finish({ success: false, error: (error_4 === null || error_4 === void 0 ? void 0 : error_4.message) || 'Erro no renderer HTML' });
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })();
                })];
        });
    });
}
/**
 * Lista impressoras disponíveis no sistema
 */
function listPrinters() {
    return __awaiter(this, void 0, void 0, function () {
        var platform, command, stdout, printers, printerArray, stdout, lines, stdout, lines, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    platform = process.platform;
                    if (!(platform === 'win32')) return [3 /*break*/, 2];
                    command = "powershell.exe -Command \"Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName, Default | ConvertTo-Json\"";
                    return [4 /*yield*/, execAsync(command)];
                case 1:
                    stdout = (_a.sent()).stdout;
                    if (!stdout) {
                        return [2 /*return*/, []];
                    }
                    printers = JSON.parse(stdout);
                    printerArray = Array.isArray(printers) ? printers : [printers];
                    return [2 /*return*/, printerArray
                            .filter(Boolean)
                            .map(function (p) {
                            var statusCode = typeof (p === null || p === void 0 ? void 0 : p.PrinterStatus) === 'number' ? p.PrinterStatus : undefined;
                            var status = mapPrinterStatus(statusCode);
                            return {
                                name: p === null || p === void 0 ? void 0 : p.Name,
                                status: status,
                                driver: p === null || p === void 0 ? void 0 : p.DriverName,
                                port: p === null || p === void 0 ? void 0 : p.PortName,
                                isDefault: Boolean(p === null || p === void 0 ? void 0 : p.Default),
                                isConnected: status === 'online',
                            };
                        })
                            .filter(function (printer) { return printer.name; })];
                case 2:
                    if (!(platform === 'darwin')) return [3 /*break*/, 4];
                    return [4 /*yield*/, execAsync('lpstat -p')];
                case 3:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    return [2 /*return*/, lines
                            .map(function (line) {
                            var match = line.match(/printer (\S+)/);
                            return match
                                ? {
                                    name: match[1],
                                    status: 'online',
                                    driver: 'Unknown',
                                    port: 'Unknown',
                                    isDefault: false,
                                    isConnected: true,
                                }
                                : null;
                        })
                            .filter(Boolean)];
                case 4: return [4 /*yield*/, execAsync('lpstat -p')];
                case 5:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    return [2 /*return*/, lines
                            .map(function (line) {
                            var match = line.match(/printer (\S+)/);
                            return match
                                ? {
                                    name: match[1],
                                    status: 'online',
                                    driver: 'Unknown',
                                    port: 'Unknown',
                                    isDefault: false,
                                    isConnected: true,
                                }
                                : null;
                        })
                            .filter(Boolean)];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_5 = _a.sent();
                    console.error('Erro ao listar impressoras:', error_5);
                    return [2 /*return*/, []];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Encontra impressora padrão do sistema
 */
function getDefaultPrinter() {
    return __awaiter(this, void 0, void 0, function () {
        var platform, command, stdout, printerName, stdout, match, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    platform = process.platform;
                    if (!(platform === 'win32')) return [3 /*break*/, 2];
                    command = "powershell.exe -Command \"(Get-Printer | Where-Object {$_.Default -eq $true}).Name\"";
                    return [4 /*yield*/, execAsync(command)];
                case 1:
                    stdout = (_a.sent()).stdout;
                    printerName = stdout === null || stdout === void 0 ? void 0 : stdout.trim();
                    return [2 /*return*/, printerName || null];
                case 2: return [4 /*yield*/, execAsync('lpstat -d')];
                case 3:
                    stdout = (_a.sent()).stdout;
                    match = stdout.match(/system default destination: (.+)/);
                    return [2 /*return*/, match ? match[1] : null];
                case 4: return [3 /*break*/, 6];
                case 5:
                    error_6 = _a.sent();
                    console.error('Erro ao obter impressora padrão:', error_6);
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Determina largura em colunas para impressão térmica
 */
function normalizePaperWidth(options) {
    var _a, _b;
    var paperSize = (_a = options === null || options === void 0 ? void 0 : options.paperSize) !== null && _a !== void 0 ? _a : '80mm';
    switch (paperSize) {
        case '58mm':
            return 32;
        case 'a4':
            return 80;
        case 'custom': {
            var width = (_b = options === null || options === void 0 ? void 0 : options.customPaperWidth) !== null && _b !== void 0 ? _b : 48;
            return Math.max(16, Math.min(128, Math.round(width)));
        }
        case '80mm':
        default:
            return 48;
    }
}
/**
 * Quebra linhas longas respeitando a largura da impressora
 */
function formatContentForThermal(content, columns) {
    var sanitizedColumns = Math.max(16, Math.min(128, columns || 48));
    var lines = [];
    content.split('\n').forEach(function (rawLine) {
        var line = rawLine !== null && rawLine !== void 0 ? rawLine : '';
        if (line.length <= sanitizedColumns) {
            lines.push(line);
            return;
        }
        while (line.length > sanitizedColumns) {
            lines.push(line.slice(0, sanitizedColumns));
            line = line.slice(sanitizedColumns);
        }
        if (line.length > 0) {
            lines.push(line);
        }
    });
    return lines;
}
/**
 * Resolve interface utilizada para impressão térmica
 */
function resolveThermalInterface(printerName, options) {
    var _a;
    var port = (_a = options === null || options === void 0 ? void 0 : options.port) === null || _a === void 0 ? void 0 : _a.trim();
    if (!port) {
        return "printer:".concat(printerName);
    }
    var portLower = port.toLowerCase();
    if (portLower.startsWith('tcp://') ||
        portLower.startsWith('http://') ||
        portLower.startsWith('https://') ||
        portLower.startsWith('socket://')) {
        return port;
    }
    // COM/tty/LPT: interface direta. USB001 no Windows é spooler — usar nome da impressora.
    if (/^com\d+$/i.test(portLower.replace(/:$/, '')) ||
        portLower.startsWith('/dev/tty') ||
        portLower.startsWith('lpt')) {
        return port;
    }
    return "printer:".concat(printerName);
}
/**
 * Converte código de status em texto amigável
 */
function mapPrinterStatus(status) {
    if (status === undefined || status === null) {
        return 'unknown';
    }
    switch (status) {
        case 0:
        case 9:
        case 10:
        case 11:
        case 14:
        case 15:
        case 16:
            return 'online';
        case 1:
        case 4:
        case 5:
        case 6:
        case 7:
        case 17:
        case 18:
            return 'warning';
        case 2:
        case 20:
        case 21:
            return 'error';
        case 8:
            return 'offline';
        default:
            return 'unknown';
    }
}
/**
 * Imprime conteúdo usando node-thermal-printer (suporta ESC/POS)
 */
function printWithThermalPrinter(printerName, content, options) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, ThermalPrinter_1, PrinterTypes_1, interfaceTarget_1, columns_1, segments, parts, printSegment, index, segment, isLast, error_7;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, loadThermalPrinterModule()];
                case 1:
                    _a = _b.sent(), ThermalPrinter_1 = _a.default, PrinterTypes_1 = _a.PrinterTypes;
                    interfaceTarget_1 = resolveThermalInterface(printerName, options);
                    columns_1 = normalizePaperWidth(options);
                    segments = splitReceiptCopies(content);
                    parts = segments.length > 0 ? segments : [ensureTrailingNewlines(content)];
                    // Para vendas a prazo, garantir que temos exatamente 2 partes (loja e cliente)
                    if (parts.length > 2) {
                        console.warn("N\u00FAmero de partes excedeu 2 (".concat(parts.length, "), usando apenas as 2 primeiras"));
                        parts.splice(2);
                    }
                    printSegment = function (segment, isLast) { return __awaiter(_this, void 0, void 0, function () {
                        var printer, initBuffer, parts, _i, parts_3, part, lines, _a, lines_2, line, encodedLine, executed;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    printer = new ThermalPrinter_1({
                                        type: PrinterTypes_1.EPSON,
                                        interface: interfaceTarget_1,
                                        removeSpecialCharacters: false,
                                        options: {
                                            timeout: 5000,
                                        },
                                    });
                                    initBuffer = buildInitializationBuffer();
                                    printer.raw(initBuffer); // Reset e define code page CP858
                                    printer.alignLeft();
                                    parts = parseEscPosSegment(segment);
                                    for (_i = 0, parts_3 = parts; _i < parts_3.length; _i++) {
                                        part = parts_3[_i];
                                        if (part.kind === 'binary') {
                                            printer.raw(part.value);
                                            continue;
                                        }
                                        lines = formatContentForThermal(part.value, columns_1);
                                        for (_a = 0, lines_2 = lines; _a < lines_2.length; _a++) {
                                            line = lines_2[_a];
                                            encodedLine = encodeForEscPos(line);
                                            if (encodedLine.length > 0) {
                                                printer.raw(encodedLine);
                                            }
                                            printer.raw(NEW_LINE);
                                        }
                                    }
                                    printer.raw(NEW_LINE);
                                    printer.raw(NEW_LINE);
                                    printer.raw(NEW_LINE);
                                    if ((options === null || options === void 0 ? void 0 : options.autoCut) !== false || !isLast) {
                                        printer.cut();
                                    }
                                    return [4 /*yield*/, printer.execute()];
                                case 1:
                                    executed = _b.sent();
                                    if (!executed) {
                                        throw new Error('Falha ao enviar dados para a impressora térmica');
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    index = 0;
                    _b.label = 2;
                case 2:
                    if (!(index < parts.length)) return [3 /*break*/, 6];
                    segment = parts[index];
                    isLast = index === parts.length - 1;
                    return [4 /*yield*/, printSegment(segment, isLast)];
                case 3:
                    _b.sent();
                    if (!(!isLast && parts.length === 2)) return [3 /*break*/, 5];
                    console.log("Aguardando 3 segundos antes de imprimir a pr\u00F3xima via...");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    index++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, { success: true }];
                case 7:
                    error_7 = _b.sent();
                    console.error('Erro ao imprimir com thermal printer:', error_7);
                    return [2 /*return*/, { success: false, error: (error_7 === null || error_7 === void 0 ? void 0 : error_7.message) || 'Erro desconhecido ao imprimir' }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Envia arquivo RAW para impressora Windows via cópia binária no share local.
 * Preserva comandos ESC/POS (QR Code) melhor que Out-Printer/GDI.
 */
function printRawFileWindows(tempFile, printerName) {
    return __awaiter(this, void 0, void 0, function () {
        var filePathPs, printerPs, ps, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filePathPs = tempFile.replace(/'/g, "''");
                    printerPs = printerName.replace(/'/g, "''");
                    ps = [
                        "$ErrorActionPreference='Stop'",
                        "$src='".concat(filePathPs, "'"),
                        "$printer='".concat(printerPs, "'"),
                        // Tenta share UNC localhost; se a impressora não estiver compartilhada, falha e retorna false
                        "$dest=('\\\\localhost\\' + $printer)",
                        'cmd /c copy /b `"$src`" `"$dest`"',
                    ].join('; ');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync("powershell.exe -NoProfile -NonInteractive -Command \"".concat(ps, "\""))];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_8 = _a.sent();
                    console.warn("RAW copy Windows falhou (".concat(printerName, "): ").concat((error_8 === null || error_8 === void 0 ? void 0 : error_8.message) || error_8, ". Tentando fallback."));
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Imprime usando comandos do sistema operacional (fallback universal)
 */
function printWithSystemPrinter(printerName, content, options) {
    return __awaiter(this, void 0, void 0, function () {
        var platform_1, shouldAutoCut_1, segments, parts, initBuffer_1, newlineBuffer_1, cutFull_1, printSegment, index, segment, isLast, error_9;
        var _this = this;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    platform_1 = process.platform;
                    shouldAutoCut_1 = (options === null || options === void 0 ? void 0 : options.autoCut) !== false && ((_a = options === null || options === void 0 ? void 0 : options.paperSize) !== null && _a !== void 0 ? _a : '80mm') !== 'a4';
                    segments = splitReceiptCopies(content);
                    parts = segments.length > 0 ? segments : [ensureTrailingNewlines(content)];
                    // Para vendas a prazo, garantir que temos exatamente 2 partes (loja e cliente)
                    if (parts.length > 2) {
                        console.warn("N\u00FAmero de partes excedeu 2 (".concat(parts.length, "), usando apenas as 2 primeiras"));
                        parts.splice(2);
                    }
                    initBuffer_1 = buildInitializationBuffer();
                    newlineBuffer_1 = encodeForEscPos('\n\n\n');
                    cutFull_1 = Buffer.from([GS, 0x56, 0x00]);
                    printSegment = function (segment, isLast) { return __awaiter(_this, void 0, void 0, function () {
                        var tempFile, buffers, combinedBuffer, target, shareOk, command, command;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    tempFile = path.join(os.tmpdir(), "print-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(7), ".txt"));
                                    buffers = [];
                                    buffers.push(initBuffer_1);
                                    appendEscPosSegmentBuffers(buffers, segment, normalizePaperWidth(options));
                                    buffers.push(newlineBuffer_1);
                                    if (shouldAutoCut_1 || !isLast) {
                                        buffers.push(cutFull_1);
                                    }
                                    combinedBuffer = Buffer.concat(buffers);
                                    fs.writeFileSync(tempFile, combinedBuffer);
                                    target = printerName;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, , 8, 9]);
                                    if (!(platform_1 === 'win32')) return [3 /*break*/, 3];
                                    return [4 /*yield*/, printRawFileWindows(tempFile, printerName)];
                                case 2:
                                    shareOk = _a.sent();
                                    if (!shareOk) {
                                        throw new Error('Não foi possível enviar RAW à impressora no Windows. ' +
                                            'Compartilhe a impressora ou use driver ESC/POS / porta COM.');
                                    }
                                    return [3 /*break*/, 7];
                                case 3:
                                    if (!(platform_1 === 'darwin')) return [3 /*break*/, 5];
                                    command = "lp -d \"".concat(target, "\" -o raw \"").concat(tempFile, "\"");
                                    return [4 /*yield*/, execAsync(command)];
                                case 4:
                                    _a.sent();
                                    return [3 /*break*/, 7];
                                case 5:
                                    command = "lp -d \"".concat(target, "\" -o raw \"").concat(tempFile, "\"");
                                    return [4 /*yield*/, execAsync(command)];
                                case 6:
                                    _a.sent();
                                    _a.label = 7;
                                case 7: return [3 /*break*/, 9];
                                case 8:
                                    // Remover arquivo temporário após um delay
                                    setTimeout(function () {
                                        try {
                                            fs.unlinkSync(tempFile);
                                        }
                                        catch (unlinkError) {
                                            console.warn('Não foi possível remover arquivo temporário de impressão:', unlinkError);
                                        }
                                    }, 5000);
                                    return [7 /*endfinally*/];
                                case 9: return [2 /*return*/];
                            }
                        });
                    }); };
                    index = 0;
                    _b.label = 1;
                case 1:
                    if (!(index < parts.length)) return [3 /*break*/, 5];
                    segment = parts[index];
                    isLast = index === parts.length - 1;
                    return [4 /*yield*/, printSegment(segment, isLast)];
                case 2:
                    _b.sent();
                    if (!(!isLast && parts.length === 2)) return [3 /*break*/, 4];
                    console.log("Aguardando 3 segundos antes de imprimir a pr\u00F3xima via...");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    index++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, { success: true }];
                case 6:
                    error_9 = _b.sent();
                    console.error('Erro ao imprimir com sistema:', error_9);
                    return [2 /*return*/, { success: false, error: (error_9 === null || error_9 === void 0 ? void 0 : error_9.message) || 'Erro ao imprimir' }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Função principal de impressão que tenta múltiplos métodos
 */
function performPrintJob(content, options) {
    return __awaiter(this, void 0, void 0, function () {
        var normalized, printerName, resolvedPort, jobOptions, hasThermalMarkers, preferEscPos, serialResult, thermalResult, systemResult, thermalResult, systemResult, htmlResult, error_10;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 14, , 15]);
                    normalized = normalizePrintableContent(content);
                    printerName = (_a = options === null || options === void 0 ? void 0 : options.printerName) !== null && _a !== void 0 ? _a : null;
                    if (!!printerName) return [3 /*break*/, 2];
                    return [4 /*yield*/, getDefaultPrinter()];
                case 1:
                    printerName = _c.sent();
                    _c.label = 2;
                case 2:
                    if (!printerName) {
                        return [2 /*return*/, { success: false, error: 'Nenhuma impressora encontrada ou configurada' }];
                    }
                    return [4 /*yield*/, resolvePrinterPort(printerName, options)];
                case 3:
                    resolvedPort = _c.sent();
                    jobOptions = __assign(__assign({}, options), { printerName: printerName, port: (_b = resolvedPort !== null && resolvedPort !== void 0 ? resolvedPort : options === null || options === void 0 ? void 0 : options.port) !== null && _b !== void 0 ? _b : null });
                    hasThermalMarkers = PRINT_MARKER_REGEX.test(content);
                    PRINT_MARKER_REGEX.lastIndex = 0;
                    preferEscPos = isSerialPort(jobOptions.port) || hasThermalMarkers;
                    if (!preferEscPos) return [3 /*break*/, 8];
                    if (!isSerialPort(jobOptions.port)) return [3 /*break*/, 5];
                    return [4 /*yield*/, printWithSerialPort(printerName, content, jobOptions)];
                case 4:
                    serialResult = _c.sent();
                    if (serialResult.success) {
                        return [2 /*return*/, serialResult];
                    }
                    console.warn('Impressão serial falhou, tentando métodos alternativos.', serialResult.error);
                    _c.label = 5;
                case 5: return [4 /*yield*/, printWithThermalPrinter(printerName, content, jobOptions)];
                case 6:
                    thermalResult = _c.sent();
                    if (thermalResult.success) {
                        return [2 /*return*/, thermalResult];
                    }
                    return [4 /*yield*/, printWithSystemPrinter(printerName, content, jobOptions)];
                case 7:
                    systemResult = _c.sent();
                    if (systemResult.success) {
                        return [2 /*return*/, systemResult];
                    }
                    return [3 /*break*/, 11];
                case 8:
                    if (!!normalized.hasExtendedCharacters) return [3 /*break*/, 11];
                    return [4 /*yield*/, printWithThermalPrinter(printerName, content, jobOptions)];
                case 9:
                    thermalResult = _c.sent();
                    if (thermalResult.success) {
                        return [2 /*return*/, thermalResult];
                    }
                    return [4 /*yield*/, printWithSystemPrinter(printerName, content, jobOptions)];
                case 10:
                    systemResult = _c.sent();
                    if (systemResult.success) {
                        return [2 /*return*/, systemResult];
                    }
                    _c.label = 11;
                case 11:
                    console.warn('Impressão ESC/POS indisponível, utilizando fallback HTML com QR Code.');
                    return [4 /*yield*/, printWithHtmlRenderer(normalized.text, jobOptions)];
                case 12:
                    htmlResult = _c.sent();
                    if (htmlResult.success) {
                        return [2 /*return*/, htmlResult];
                    }
                    console.warn('Impressão HTML falhou, utilizando versão reduzida em Latin-1.', htmlResult.error);
                    return [4 /*yield*/, printWithSystemPrinter(printerName, content, jobOptions)];
                case 13: return [2 /*return*/, _c.sent()];
                case 14:
                    error_10 = _c.sent();
                    console.error('Erro na impressão:', error_10);
                    return [2 /*return*/, { success: false, error: (error_10 === null || error_10 === void 0 ? void 0 : error_10.message) || 'Erro desconhecido na impressão' }];
                case 15: return [2 /*return*/];
            }
        });
    });
}
export function registerPrinterHandlers() {
    var _this = this;
    // Listar impressoras disponíveis
    ipcMain.handle('printers-list', function () { return __awaiter(_this, void 0, void 0, function () {
        var printers, error_11;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, listPrinters()];
                case 1:
                    printers = _b.sent();
                    cachedPrinters = printers;
                    return [2 /*return*/, { success: true, printers: printers }];
                case 2:
                    error_11 = _b.sent();
                    return [2 /*return*/, { success: false, error: (_a = error_11 === null || error_11 === void 0 ? void 0 : error_11.message) !== null && _a !== void 0 ? _a : 'Erro ao listar impressoras', printers: [] }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Obter impressora padrão
    ipcMain.handle('printers-get-default', function () { return __awaiter(_this, void 0, void 0, function () {
        var printerName_2, printerInfo, error_12;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, getDefaultPrinter()];
                case 1:
                    printerName_2 = _c.sent();
                    printerInfo = printerName_2
                        ? cachedPrinters.find(function (printer) { return (printer === null || printer === void 0 ? void 0 : printer.name) === printerName_2; })
                        : undefined;
                    return [2 /*return*/, {
                            success: true,
                            printerName: printerName_2,
                            port: (_a = printerInfo === null || printerInfo === void 0 ? void 0 : printerInfo.port) !== null && _a !== void 0 ? _a : null,
                        }];
                case 2:
                    error_12 = _c.sent();
                    return [2 /*return*/, { success: false, error: (_b = error_12 === null || error_12 === void 0 ? void 0 : error_12.message) !== null && _b !== void 0 ? _b : 'Erro ao obter impressora padrão', printerName: null }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Limite de tamanho para evitar abuso (DoS) – ~512 KB
    var MAX_PRINT_CONTENT_LENGTH = 512 * 1024;
    // Imprimir conteúdo
    ipcMain.handle('print-content', function (_event, payload) { return __awaiter(_this, void 0, void 0, function () {
        var result, error_13;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (!payload || typeof payload.content !== 'string') {
                        return [2 /*return*/, { success: false, error: 'Conteúdo de impressão inválido' }];
                    }
                    if (payload.content.length > MAX_PRINT_CONTENT_LENGTH) {
                        return [2 /*return*/, { success: false, error: 'Conteúdo de impressão muito grande' }];
                    }
                    return [4 /*yield*/, performPrintJob(payload.content, payload.options)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
                case 2:
                    error_13 = _a.sent();
                    return [2 /*return*/, { success: false, error: 'Erro ao imprimir. Tente novamente.' }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Testar impressora
    ipcMain.handle('printers-test', function (_event, payload) { return __awaiter(_this, void 0, void 0, function () {
        var options, testContent, result, error_14;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    options = {};
                    if (typeof payload === 'string' || payload === null) {
                        options.printerName = payload !== null && payload !== void 0 ? payload : null;
                    }
                    else if (typeof payload === 'object' && payload !== null) {
                        options = __assign({}, payload);
                    }
                    testContent = "\n================================\n  TESTE DE IMPRESS\u00C3O\n================================\nEsta \u00E9 uma impress\u00E3o de teste.\nSe voc\u00EA est\u00E1 lendo isso, a\nimpressora est\u00E1 funcionando\ncorretamente.\n================================\nTESTE CONCLU\u00CDDO\n================================\n      ".trim();
                    return [4 /*yield*/, performPrintJob(testContent, options)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
                case 2:
                    error_14 = _a.sent();
                    return [2 /*return*/, { success: false, error: (error_14 === null || error_14 === void 0 ? void 0 : error_14.message) || 'Erro ao testar impressora' }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
}
