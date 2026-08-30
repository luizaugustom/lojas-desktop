/**
 * Sistema de drivers de impressora
 * Suporta as principais marcas e modelos do mercado brasileiro
 */
// Catálogo completo de drivers suportados
export var PRINTER_DRIVERS = [
    // EPSON
    {
        id: 'epson-tm-t20',
        brand: 'EPSON',
        model: 'TM-T20',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://download.epson-biz.com/modules/pos/index.php?page=soft&pid=1',
            linux: 'https://download.epson-biz.com/modules/pos/index.php?page=soft&pid=1',
        },
        installCommand: {
            windows: 'msiexec /i "EPSON_TM_T20_Installer.msi" /quiet /norestart',
            linux: 'dpkg -i epson-pos-printer-*.deb',
        },
        driverName: 'EPSON TM-T20',
        supportedPorts: ['usb', 'ethernet'],
    },
    {
        id: 'epson-tm-t82',
        brand: 'EPSON',
        model: 'TM-T82',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://download.epson-biz.com/modules/pos/index.php?page=soft&pid=1',
        },
        installCommand: {
            windows: 'msiexec /i "EPSON_TM_T82_Installer.msi" /quiet /norestart',
        },
        driverName: 'EPSON TM-T82',
        supportedPorts: ['usb', 'ethernet'],
    },
    {
        id: 'epson-tm-t88',
        brand: 'EPSON',
        model: 'TM-T88',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://download.epson-biz.com/modules/pos/index.php?page=soft&pid=1',
        },
        installCommand: {
            windows: 'msiexec /i "EPSON_TM_T88_Installer.msi" /quiet /norestart',
        },
        driverName: 'EPSON TM-T88',
        supportedPorts: ['usb', 'ethernet'],
    },
    // Bematech
    {
        id: 'bematech-mp4200th',
        brand: 'Bematech',
        model: 'MP-4200 TH',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.bematech.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Bematech_MP4200_Installer.msi" /quiet /norestart',
        },
        driverName: 'Bematech MP-4200 TH',
        supportedPorts: ['usb', 'serial'],
    },
    {
        id: 'bematech-mp4200hs',
        brand: 'Bematech',
        model: 'MP-4200 HS',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.bematech.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Bematech_MP4200_HS_Installer.msi" /quiet /norestart',
        },
        driverName: 'Bematech MP-4200 HS',
        supportedPorts: ['usb', 'serial'],
    },
    {
        id: 'bematech-mp2500th',
        brand: 'Bematech',
        model: 'MP-2500 TH',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.bematech.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Bematech_MP2500_Installer.msi" /quiet /norestart',
        },
        driverName: 'Bematech MP-2500 TH',
        supportedPorts: ['usb', 'serial'],
    },
    {
        id: 'bematech-mp4000th',
        brand: 'Bematech',
        model: 'MP-4000 TH',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.bematech.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Bematech_MP4000_Installer.msi" /quiet /norestart',
        },
        driverName: 'Bematech MP-4000 TH',
        supportedPorts: ['usb', 'serial'],
    },
    // Daruma
    {
        id: 'daruma-dr800',
        brand: 'Daruma',
        model: 'DR-800',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.daruma.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Daruma_DR800_Installer.msi" /quiet /norestart',
        },
        driverName: 'Daruma DR-800',
        supportedPorts: ['usb', 'serial'],
    },
    {
        id: 'daruma-dr700',
        brand: 'Daruma',
        model: 'DR-700',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.daruma.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Daruma_DR700_Installer.msi" /quiet /norestart',
        },
        driverName: 'Daruma DR-700',
        supportedPorts: ['usb', 'serial'],
    },
    // Elgin
    {
        id: 'elgin-i9',
        brand: 'Elgin',
        model: 'i9',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.elgin.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Elgin_i9_Installer.msi" /quiet /norestart',
        },
        driverName: 'Elgin i9',
        supportedPorts: ['usb', 'serial'],
    },
    {
        id: 'elgin-i7',
        brand: 'Elgin',
        model: 'i7',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.elgin.com.br/suporte/downloads',
        },
        installCommand: {
            windows: 'msiexec /i "Elgin_i7_Installer.msi" /quiet /norestart',
        },
        driverName: 'Elgin i7',
        supportedPorts: ['usb', 'serial'],
    },
    // Zebra
    {
        id: 'zebra-zp450',
        brand: 'Zebra',
        model: 'ZP 450',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.zebra.com/us/en/support-downloads/printers/desktop/zp450.html',
        },
        installCommand: {
            windows: 'msiexec /i "Zebra_ZP450_Installer.msi" /quiet /norestart',
        },
        driverName: 'Zebra ZP 450',
        supportedPorts: ['usb', 'ethernet'],
    },
    // Star Micronics
    {
        id: 'star-tsp100',
        brand: 'Star Micronics',
        model: 'TSP100',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.starmicronics.com/support/DownloadLibrary.aspx',
        },
        installCommand: {
            windows: 'msiexec /i "Star_TSP100_Installer.msi" /quiet /norestart',
        },
        driverName: 'Star TSP100',
        supportedPorts: ['usb', 'ethernet'],
    },
    // Bixolon
    {
        id: 'bixolon-srp330',
        brand: 'Bixolon',
        model: 'SRP-330',
        type: 'thermal',
        downloadUrl: {
            windows: 'https://www.bixolon.com/support/download',
        },
        installCommand: {
            windows: 'msiexec /i "Bixolon_SRP330_Installer.msi" /quiet /norestart',
        },
        driverName: 'Bixolon SRP-330',
        supportedPorts: ['usb', 'serial', 'ethernet'],
    },
    // Generic ESC/POS
    {
        id: 'generic-escpos',
        brand: 'Genérico',
        model: 'ESC/POS (USB)',
        type: 'thermal',
        downloadUrl: {},
        installCommand: {},
        driverName: 'Generic ESC/POS',
        supportedPorts: ['usb'],
    },
];
// Agrupar por marca
export function getDriversByBrand() {
    var grouped = {};
    PRINTER_DRIVERS.forEach(function (driver) {
        if (!grouped[driver.brand]) {
            grouped[driver.brand] = [];
        }
        grouped[driver.brand].push(driver);
    });
    return grouped;
}
// Buscar driver por ID
export function getDriverById(id) {
    return PRINTER_DRIVERS.find(function (d) { return d.id === id; });
}
// Buscar drivers por marca
export function getDriversByBrandName(brand) {
    return PRINTER_DRIVERS.filter(function (d) { return d.brand.toLowerCase() === brand.toLowerCase(); });
}
// Detectar marca provável baseado no nome da impressora
export function detectPrinterBrand(printerName) {
    var nameLower = printerName.toLowerCase();
    if (nameLower.includes('epson') || nameLower.includes('tm-')) {
        return 'EPSON';
    }
    if (nameLower.includes('bematech') || nameLower.includes('mp-') || nameLower.includes('mp4200')) {
        return 'Bematech';
    }
    if (nameLower.includes('daruma') || nameLower.includes('dr-')) {
        return 'Daruma';
    }
    if (nameLower.includes('elgin') || nameLower.includes('i9') || nameLower.includes('i7')) {
        return 'Elgin';
    }
    if (nameLower.includes('zebra') || nameLower.includes('zp')) {
        return 'Zebra';
    }
    if (nameLower.includes('star') || nameLower.includes('tsp')) {
        return 'Star Micronics';
    }
    if (nameLower.includes('bixolon') || nameLower.includes('srp')) {
        return 'Bixolon';
    }
    return null;
}
