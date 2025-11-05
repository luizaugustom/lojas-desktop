/**
 * Utilitários para detectar e registrar dispositivos do computador do usuário
 * Versão Desktop - usa Electron IPC para acessar APIs do sistema
 */

const COMPUTER_ID_KEY = 'montshop_computer_id';

/**
 * Gera ou recupera um identificador único para o computador
 */
export function getComputerId(): string {
  let computerId = localStorage.getItem(COMPUTER_ID_KEY);
  
  if (!computerId) {
    // Gera um ID único baseado em informações do sistema
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '',
    ].join('|');
    
    // Gera hash simples
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    computerId = `comp_${Math.abs(hash).toString(36)}${Date.now().toString(36)}`;
    localStorage.setItem(COMPUTER_ID_KEY, computerId);
  }
  
  return computerId;
}

/**
 * Detecta impressoras usando Electron IPC
 */
export async function detectClientPrinters(): Promise<any[]> {
  const printers: any[] = [];

  try {
    // Verifica se está no Electron
    // Funcionalidades de impressão removidas - não detectar mais impressoras
    // if (!window.electronAPI?.printers?.list) {
    //   console.warn('[DeviceDetection] Electron API não disponível');
    //   return printers;
    // }

    console.log('[DeviceDetection] Configuração de impressoras removida - não detectando mais');
    
    // Configuração de impressoras removida - não detectar mais
    const systemPrinters: any[] = [];
    
    if (false && Array.isArray(systemPrinters) && systemPrinters.length > 0) {
      // Converte para formato esperado pela API
      printers.push(...systemPrinters.map((printer: any) => {
        // Determina tipo de conexão baseado na porta
        const port = printer.port || printer.PortName || 'Unknown';
        const portLower = port.toLowerCase();
        
        let connection: 'usb' | 'network' | 'bluetooth' | 'local' = 'local';
        if (portLower.includes('usb')) {
          connection = 'usb';
        } else if (portLower.includes('tcp') || portLower.includes('ip') || /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(port)) {
          connection = 'network';
        } else if (portLower.includes('bluetooth') || portLower.includes('bt')) {
          connection = 'bluetooth';
        }
        
        return {
          name: printer.name || printer.Name,
          driver: printer.driver || printer.DriverName || 'Unknown',
          port: port,
          status: printer.status === 'online' || printer.PrinterStatus === 0 ? 'online' : 'offline',
          isDefault: printer.isDefault || printer.IsDefault || false,
          connection,
        };
      }));
      
      console.log(`[DeviceDetection] ${printers.length} impressora(s) detectada(s) via Electron`);
    } else {
      console.log('[DeviceDetection] Nenhuma impressora encontrada no sistema');
    }
  } catch (error) {
    console.error('[DeviceDetection] Erro ao detectar impressoras:', error);
  }

  return printers;
}

/**
 * Detecta balanças (portas seriais) - por enquanto retorna vazio
 * TODO: Implementar detecção de balanças via Electron
 */
export async function detectClientScales(): Promise<any[]> {
  const scales: any[] = [];
  
  // TODO: Implementar detecção de balanças via Electron
  // Por enquanto retorna vazio
  console.log('[DeviceDetection] Detecção de balanças ainda não implementada');
  
  return scales;
}

/**
 * Detecta todos os dispositivos disponíveis no computador
 */
export async function detectAllDevices(): Promise<{ printers: any[]; scales: any[] }> {
  console.log('[DeviceDetection] Iniciando detecção de dispositivos no desktop...');
  
  const [printers, scales] = await Promise.all([
    detectClientPrinters(),
    detectClientScales(),
  ]);

  console.log(`[DeviceDetection] Detectados: ${printers.length} impressora(s), ${scales.length} balança(s)`);

  return { printers, scales };
}

