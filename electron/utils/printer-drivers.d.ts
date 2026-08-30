/**
 * Sistema de drivers de impressora
 * Suporta as principais marcas e modelos do mercado brasileiro
 */
export interface PrinterDriver {
    id: string;
    brand: string;
    model: string;
    type: 'thermal' | 'impact' | 'inkjet' | 'laser';
    downloadUrl: {
        windows?: string;
        linux?: string;
        mac?: string;
    };
    expectedHash?: {
        windows?: string;
        linux?: string;
        mac?: string;
    };
    hashAlgorithm?: 'md5' | 'sha256';
    installCommand: {
        windows?: string;
        linux?: string;
        mac?: string;
    };
    driverName: string;
    supportedPorts: ('usb' | 'serial' | 'ethernet' | 'bluetooth')[];
    fileSize?: {
        windows?: number;
        linux?: number;
        mac?: number;
    };
}
export declare const PRINTER_DRIVERS: PrinterDriver[];
export declare function getDriversByBrand(): Record<string, PrinterDriver[]>;
export declare function getDriverById(id: string): PrinterDriver | undefined;
export declare function getDriversByBrandName(brand: string): PrinterDriver[];
export declare function detectPrinterBrand(printerName: string): string | null;
